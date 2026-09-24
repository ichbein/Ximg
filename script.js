const fileInput = document.getElementById("fileInput");
const selectButton = document.getElementById("selectButton");
const dropZone = document.getElementById("dropZone");

const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");

const resize = document.getElementById("resize");
const customWidth = document.getElementById("customWidth");

const outputFormat = document.getElementById("outputFormat");

const compressButton = document.getElementById("compressButton");

const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");

const resultsSection = document.getElementById("resultsSection");
const resultsList = document.getElementById("resultsList");

const totalBefore = document.getElementById("totalBefore");
const totalAfter = document.getElementById("totalAfter");
const totalSaved = document.getElementById("totalSaved");

const downloadAllButton = document.getElementById("downloadAllButton");

const progressContainer = document.getElementById("progressContainer");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");

const clearFilesButton = document.getElementById("clearFilesButton");
const clearResultsButton = document.getElementById("clearResultsButton");

let selectedFiles = [];
let compressedResults = [];

const previewURLs = new Set();
const resultURLs = new Set();

resultsSection.hidden = true;
downloadAllButton.hidden = true;
progressContainer.hidden = true;

selectButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
});

dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    addFiles(event.dataTransfer.files);
});

quality.addEventListener("input", () => {
    if (!quality.disabled) {
        qualityValue.textContent = `${quality.value}%`;
    }
});

resize.addEventListener("change", () => {
    customWidth.hidden = resize.value !== "custom";

    if (resize.value !== "custom") {
        customWidth.value = "";
    }
});

outputFormat.addEventListener("change", () => {
    const isPNG = outputFormat.value === "image/png";

    quality.disabled = isPNG;

    qualityValue.textContent = isPNG
        ? "N/A"
        : `${quality.value}%`;
});

compressButton.addEventListener("click", async () => {
    if (selectedFiles.length === 0) {
        alert("Select at least one image.");
        return;
    }

    if (
        resize.value === "custom" &&
        (!customWidth.value || Number(customWidth.value) <= 0)
    ) {
        alert("Enter a valid custom width.");
        customWidth.focus();
        return;
    }

    compressButton.disabled = true;
    compressButton.textContent = "Compressing...";

    compressedResults = [];

    selectedFiles.forEach(file => {
        file.processingError = null;
    });

    progressContainer.hidden = false;
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";
    progressText.textContent =
        `Processing 0 of ${selectedFiles.length}`;

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        try {
            const result = await compressImage(file);
            compressedResults.push(result);
        } catch (error) {
            file.processingError =
                error.message || "Processing failed.";

            console.error(
                `Failed to process ${file.name}:`,
                error
            );
        }

        const completed = i + 1;
        const percentage = Math.round(
            (completed / selectedFiles.length) * 100
        );

        progressFill.style.width = `${percentage}%`;
        progressPercent.textContent = `${percentage}%`;
        progressText.textContent =
            `Processing ${completed} of ${selectedFiles.length}`;

        renderFiles();
    }

    renderResults();

    progressText.textContent =
        compressedResults.length === selectedFiles.length
            ? "Completed"
            : "Completed with errors";

    progressPercent.textContent = "100%";
    progressFill.style.width = "100%";

    compressButton.disabled = false;
    compressButton.textContent = "Compress Images";
});

downloadAllButton.addEventListener("click", () => {
    compressedResults.forEach((result, index) => {
        setTimeout(() => {
            downloadBlob(result.blob, result.name);
        }, index * 200);
    });
});

clearFilesButton.addEventListener("click", () => {
    cleanupURLs();

    selectedFiles = [];
    compressedResults = [];

    renderFiles();
    clearResultsUI();

    progressContainer.hidden = true;
});

clearResultsButton.addEventListener("click", () => {
    cleanupURLs();

    compressedResults = [];

    clearResultsUI();

    selectedFiles.forEach(file => {
        file.processingError = null;
    });

    renderFiles();
});

function addFiles(files) {
    const imageFiles = Array.from(files).filter(file =>
        [
            "image/jpeg",
            "image/png",
            "image/webp"
        ].includes(file.type)
    );

    const newFiles = imageFiles.filter(file =>
        !selectedFiles.some(existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified
        )
    );

    selectedFiles = [
        ...selectedFiles,
        ...newFiles
    ];

    renderFiles();
}

function renderFiles() {
    revokePreviewURLs();

    fileList.innerHTML = "";

    fileCount.textContent =
        `${selectedFiles.length} ${
            selectedFiles.length === 1
                ? "image"
                : "images"
        }`;

    if (selectedFiles.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "+";

        const text = document.createElement("p");
        text.textContent = "No images selected";

        const description = document.createElement("span");
        description.textContent =
            "Select or drop images above to get started.";

        emptyState.append(
            icon,
            text,
            description
        );

        fileList.appendChild(emptyState);

        return;
    }

    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "file-item";

        const preview = document.createElement("img");
        preview.className = "file-preview";
        preview.alt = "";

        const imageURL = URL.createObjectURL(file);
        previewURLs.add(imageURL);
        preview.src = imageURL;

        preview.onload = () => {
            URL.revokeObjectURL(imageURL);
            previewURLs.delete(imageURL);
        };

        const info = document.createElement("div");
        info.className = "file-info";

        const name = document.createElement("div");
        name.className = "file-name";
        name.textContent = file.name;

        const size = document.createElement("div");
        size.className = "file-size";

        if (file.processingError) {
            size.textContent = file.processingError;
            size.classList.add("error");
        } else {
            size.textContent =
                formatFileSize(file.size);
        }

        const removeButton =
            document.createElement("button");

        removeButton.className =
            "remove-button";

        removeButton.type = "button";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", () => {
            selectedFiles.splice(index, 1);
            renderFiles();
        });

        info.append(name, size);
        item.append(
            preview,
            info,
            removeButton
        );

        fileList.appendChild(item);
    });
}

async function compressImage(file) {
    const image = await loadImage(file);

    if (!image.width || !image.height) {
        throw new Error(
            "Invalid image dimensions."
        );
    }

    const maxPixels = 50000000;
    const totalPixels =
        image.width * image.height;

    if (totalPixels > maxPixels) {
        throw new Error(
            `Image is too large (${image.width} × ${image.height}).`
        );
    }

    const dimensions = calculateDimensions(
        image.width,
        image.height
    );

    const canvas =
        document.createElement("canvas");

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context =
        canvas.getContext("2d");

    if (!context) {
        throw new Error(
            "Canvas is not supported."
        );
    }

    context.drawImage(
        image,
        0,
        0,
        dimensions.width,
        dimensions.height
    );

    let format = outputFormat.value;

    if (format === "original") {
        format = file.type;
    }

    if (
        ![
            "image/jpeg",
            "image/png",
            "image/webp"
        ].includes(format)
    ) {
        throw new Error(
            "Unsupported output format."
        );
    }

    if (format === "image/jpeg") {
        context.globalCompositeOperation =
            "destination-over";

        context.fillStyle = "#ffffff";

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.globalCompositeOperation =
            "source-over";
    }

    const blob = await canvasToBlob(
        canvas,
        format,
        format === "image/png"
            ? undefined
            : Number(quality.value) / 100
    );

    if (!blob || blob.size === 0) {
        throw new Error(
            "Compression failed."
        );
    }

    return {
        originalFile: file,
        blob,
        name: createOutputName(
            file.name,
            format
        ),
        originalSize: file.size,
        compressedSize: blob.size
    };
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url =
            URL.createObjectURL(file);

        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(
                new Error(
                    "Could not read this image."
                )
            );
        };

        image.src = url;
    });
}

function calculateDimensions(
    originalWidth,
    originalHeight
) {
    if (resize.value === "original") {
        return {
            width: originalWidth,
            height: originalHeight
        };
    }

    let maxWidth;

    if (resize.value === "custom") {
        maxWidth = Number(
            customWidth.value
        );

        if (!maxWidth || maxWidth <= 0) {
            return {
                width: originalWidth,
                height: originalHeight
            };
        }
    } else {
        maxWidth = Number(
            resize.value
        );
    }

    if (originalWidth <= maxWidth) {
        return {
            width: originalWidth,
            height: originalHeight
        };
    }

    const ratio =
        maxWidth / originalWidth;

    return {
        width: Math.round(
            originalWidth * ratio
        ),
        height: Math.round(
            originalHeight * ratio
        )
    };
}

function canvasToBlob(
    canvas,
    type,
    qualityValue
) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(
                            new Error(
                                "Could not create output image."
                            )
                        );
                    }
                },
                type,
                qualityValue
            );
        } catch {
            reject(
                new Error(
                    "Image encoding failed."
                )
            );
        }
    });
}

function createOutputName(
    originalName,
    format
) {
    const baseName =
        originalName.replace(
            /\.[^/.]+$/,
            ""
        );

    if (format === "image/jpeg") {
        return `${baseName}.jpg`;
    }

    if (format === "image/png") {
        return `${baseName}.png`;
    }

    if (format === "image/webp") {
        return `${baseName}.webp`;
    }

    return originalName;
}

function renderResults() {
    revokeResultURLs();

    resultsList.innerHTML = "";

    let before = 0;
    let after = 0;

    compressedResults.forEach(result => {
        before += result.originalSize;
        after += result.compressedSize;

        const item =
            document.createElement("div");

        item.className = "result-item";

        const preview =
            document.createElement("img");

        preview.className =
            "result-preview";

        preview.alt = "";

        const previewURL =
            URL.createObjectURL(
                result.blob
            );

        resultURLs.add(previewURL);
        preview.src = previewURL;

        preview.onload = () => {
            URL.revokeObjectURL(
                previewURL
            );

            resultURLs.delete(
                previewURL
            );
        };

        const info =
            document.createElement("div");

        info.className =
            "result-info";

        const name =
            document.createElement("div");

        name.className =
            "result-name";

        name.textContent =
            result.name;

        const size =
            document.createElement("div");

        size.className =
            "result-size";

        size.textContent =
            `${formatFileSize(
                result.originalSize
            )} → ${formatFileSize(
                result.compressedSize
            )}`;

        const percentage =
            result.originalSize > 0
                ? (
                (
                    result.originalSize -
                    result.compressedSize
                ) /
                result.originalSize
            ) * 100
                : 0;

        const saving =
            document.createElement("div");

        saving.className =
            "result-saving";

        saving.textContent =
            percentage >= 0
                ? `Saved ${percentage.toFixed(1)}%`
                : `+${Math.abs(
                    percentage
                ).toFixed(1)}%`;

        const downloadButton =
            document.createElement("button");

        downloadButton.className =
            "result-download";

        downloadButton.type = "button";
        downloadButton.textContent =
            "Download";

        downloadButton.addEventListener(
            "click",
            () => {
                downloadBlob(
                    result.blob,
                    result.name
                );
            }
        );

        info.append(name, size);

        item.append(
            preview,
            info,
            saving,
            downloadButton
        );

        resultsList.appendChild(item);
    });

    totalBefore.textContent =
        formatFileSize(before);

    totalAfter.textContent =
        formatFileSize(after);

    const totalPercentage =
        before > 0
            ? ((before - after) / before) * 100
            : 0;

    totalSaved.textContent =
        `${totalPercentage.toFixed(1)}%`;

    const hasResults =
        compressedResults.length > 0;

    resultsSection.hidden =
        !hasResults;

    downloadAllButton.hidden =
        !hasResults;
}

function clearResultsUI() {
    resultsList.innerHTML = "";

    totalBefore.textContent = "0 B";
    totalAfter.textContent = "0 B";
    totalSaved.textContent = "0%";

    resultsSection.hidden = true;
    downloadAllButton.hidden = true;
}

function downloadBlob(blob, filename) {
    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

function revokePreviewURLs() {
    previewURLs.forEach(url => {
        URL.revokeObjectURL(url);
    });

    previewURLs.clear();
}

function revokeResultURLs() {
    resultURLs.forEach(url => {
        URL.revokeObjectURL(url);
    });

    resultURLs.clear();
}

function cleanupURLs() {
    revokePreviewURLs();
    revokeResultURLs();
}

function formatFileSize(bytes) {
    if (bytes === 0) {
        return "0 B";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];

    const index = Math.min(
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        ),
        units.length - 1
    );

    return `${(
        bytes /
        Math.pow(1024, index)
    ).toFixed(2)} ${units[index]}`;
}

renderFiles();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js");
    });
}