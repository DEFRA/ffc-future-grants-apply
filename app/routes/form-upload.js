const { urlPrefix } = require("../config/index");
const { uploadFile, deleteFile } = require("../services/blob-storage");
const { TextEncoder } = require('util');
const {
  getToken,
  sendToAvScan,
  getScanResult,
  checkingSingleAvGetResponse
} = require("../utils/AvHelperFunctions");
const { v4: uuidv4 } = require("uuid");
const viewTemplate = "form-upload";
const currentPath = `${urlPrefix}/${viewTemplate}`;
const backLink = `${urlPrefix}/form-download`;
const {
  fileCheck,
  createErrorsSummaryList
} = require("../utils/uploadHelperFunctions");
function createModel(claimForm, multiForms) {
  return {
    multiForms: { ...multiForms },
    claimForm: claimForm,
    formActionPage: currentPath,
    errorMessage: {
      claim: null,
      purchased: null,
      paid: null,
      inPlace: null,
      conditions: null
    },
    backLink,
    errorSummaryList: []
  };
}
module.exports = [
  {
    method: "GET",
    path: currentPath,
    options: {
      auth: false
    },
    handler: (request, h) => {
      const formSubmitted = createModel(null, null);
      request.yar.set("formSubmitted", formSubmitted);
      return h.view(viewTemplate, formSubmitted);
    }
  },
  {
    method: "POST",
    path: currentPath,
    options: {
      auth: false,
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 20000000 * 1024,
        failAction: async (request, h, error) => {
          const inputName = request.payload.action.split("-")[1];
          let formSubmitted = request.yar.get("formSubmitted");
          if (
            error.output.payload.message.includes(
              "Payload content length greater than maximum "
            )
          ) {
            formSubmitted = {
              ...formSubmitted,
              errorMessage: {
                ...formSubmitted.errorMessage,
                [inputName]: {
                  html: "The selected file must be smaller than 20MB",
                  href: "#" + inputName
                }
              }
            };
            request.yar.set("formSubmitted", formSubmitted);
            return h.view(viewTemplate, formSubmitted).takeover();
          }
          formSubmitted = {
            ...formSubmitted,
            errorMessage: { ...formSubmitted.errorMessage, [inputName]: error }
          };
          return h.view(viewTemplate, formSubmitted).takeover();
        }
      }
    },
    handler: async (request, h) => {
      const { action } = request.payload;
      const actionPath = action.split("-");
      let formSubmitted = request.yar.get("formSubmitted");
      if (actionPath[0] === "singleUpload") {
        try {
          const claimFormFile = request.payload.claimForm;
          const fileCheckDetails = fileCheck(
            claimFormFile,
            "claim",
            formSubmitted
          );
          if (!fileCheckDetails.isCheckPassed) {
            formSubmitted = {
              ...formSubmitted,
              errorMessage: {
                ...formSubmitted.errorMessage,
                claim: { html: fileCheckDetails.html, href: "#claim" }
              },
              claimForm: null
            };
            const errorsList = createErrorsSummaryList(
              formSubmitted,
              [{ html: fileCheckDetails.html, href: "#claimForm" }],
              "claim"
            );
            formSubmitted.errorSummaryList = errorsList;
            request.yar.set("formSubmitted", formSubmitted);
            return h.view(viewTemplate, formSubmitted).takeover();
          } else {
            const { token } = await getToken();
            const key = uuidv4();
            if (token) {
              const content = Buffer.from(claimFormFile._data).toString('base64');
              const result = await sendToAvScan(
                token,
                {
                  key,
                  collection: "claim",
                  service: "fgp",
                  extension: fileCheckDetails.fileExtension,
                  content,
                  fileName: fileCheckDetails.uploadedFileName
                }
              )
              console.log(result)
              if (result.isScanned && result.isSafe) {
                const fileUploaded = await uploadFile(
                  fileCheckDetails.fileBuffer,
                  fileCheckDetails.uploadedFileName,
                  'claim'
                )
                formSubmitted = {
                  ...formSubmitted,
                  claimForm: {
                    fileSize: fileCheckDetails.fileSizeFormatted,
                    fileName: fileUploaded.originalFileName,
                  },
                  errorMessage: {
                    ...formSubmitted.errorMessage,
                    claim: null,
                  },
                }
                const errorsList = createErrorsSummaryList(
                  formSubmitted,
                  null,
                  'claim'
                )
                formSubmitted.errorSummaryList = errorsList;
                request.yar.set('formSubmitted', formSubmitted);
              return h.view('form-upload', formSubmitted)
              }
              if(result.isScanned && !result.isSafe) {
                formSubmitted = {
                  ...formSubmitted,
                  errorMessage: {
                    ...formSubmitted.errorMessage,
                    claim: { html: `${fileCheckDetails.uploadedFileName} can't be uploaded as it's not a safe file`, href: '#claim' }
                  },
                  claimForm: null
                }
                const errorsList = createErrorsSummaryList(
                  formSubmitted,
                  [{ html: `${fileCheckDetails.uploadedFileName} can't be uploaded as it's not a safe file`, href: '#claim' }],
                  'claim'
                )
                formSubmitted.errorSummaryList = errorsList
                request.yar.set('formSubmitted', formSubmitted);
               return h.view('form-upload', formSubmitted)
              }
            }
          }
        } catch (error) {
          return h
            .view(
              viewTemplate,
              createModel(
                "The selected file could not be uploaded – try again",
                false,
                null
              )
            )
            .takeover();
        }
      } else if (actionPath[0] === "delete") {
        const fileName = request.payload.fileName;
        if (!fileName || !fileName.length) {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: "Invalid file name"
            }
          };
          request.yar.set("formSubmitted", formSubmitted);
          return h.view(viewTemplate, formSubmitted).takeover();
        }
        const isDeleted = await deleteFile(fileName, actionPath[1]);
        if (isDeleted && actionPath[1] === "claim") {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: null
            },
            claimForm: null
          };
          request.yar.set("formSubmitted", formSubmitted);
          return h.view(viewTemplate, formSubmitted);
        } else if (isDeleted && actionPath[1] !== "claim") {
          const filteredArray = formSubmitted.multiForms[actionPath[1]].filter(
            (item) => item.uploadedFileName !== fileName
          );
          formSubmitted = {
            ...formSubmitted,
            multiForms: {
              ...formSubmitted.multiForms,
              [actionPath[1]]: filteredArray
            }
          };
          request.yar.set("formSubmitted", formSubmitted);
          return h.view(viewTemplate, formSubmitted);
        } else {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: "Error deleting file"
            }
          };
          request.yar.set("formSubmitted", formSubmitted);
          return h.view(viewTemplate, formSubmitted).takeover();
        }
      } else if (actionPath[0] === "multiUpload") {
        let filesArray = request.payload[actionPath[1]];
        if (!filesArray.length) {
          filesArray = [filesArray];
        }
        if (filesArray.length > 15) {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              [actionPath[1]]: {
                html: "Uploaded files must be less than 15 files.",
                href: "#" + actionPath[1]
              }
            }
          };
          const errorsList = createErrorsSummaryList(
            formSubmitted,
            [
              {
                href: "#" + actionPath[1],
                html: "Uploaded files must be less than 15 files."
              }
            ],
            actionPath[1]
          );
          formSubmitted.errorSummaryList = errorsList;
          request.yar.set("formSubmitted", formSubmitted);
          return h.view(viewTemplate, formSubmitted);
        }

        const newFilesArray = [];
        const errorArray = [];
        const { token } = await getToken();
        
        if (token) {
          const filesToScan = [];
          for (const file of filesArray) {
            const fileCheckDetails = fileCheck(file, actionPath[1], formSubmitted);
        
            if (fileCheckDetails.isCheckPassed) {
              const avFileBlob = new Blob([file._data], {
                type: file.hapi.headers["content-type"]
              });
              const key = uuidv4();
              const result = await sendToAvScan(
                token,
                actionPath[1],
                avFileBlob,
                {
                  key,
                  collection: actionPath[1],
                  service: "fgp",
                  extension: fileCheckDetails.fileExtension,
                  fileName: fileCheckDetails.uploadedFileName
                },
                key
              );
        
              if (result === 204) {
                filesToScan.push({ ...fileCheckDetails, key });
              } else {
                errorArray.push({
                  html: `${fileCheckDetails.uploadedFileName}, can't be uploaded due to server error`,
                  href: "#" + actionPath[1]
                });
              }
            } else {
              errorArray.push({
                html: fileCheckDetails.html,
                href: "#" + actionPath[1]
              });
            }
          }        
          for (const awaitingFile of filesToScan) {
            try {
              await new Promise(async (resolve, reject) => {
                let counter = 0;
                const intervalId = setInterval(async () => {
                  console.log("counter===> ", counter);
          
                  try {
                    const scannedResult = await getScanResult(
                      token,
                      actionPath[1],
                      awaitingFile.key
                    );          
                    if (scannedResult.isScanned && scannedResult.isSafe) {
                      console.log("scanned and no virus!!!!!!\n", "Scan result===>\n", scannedResult);
                      newFilesArray.push(awaitingFile);
          
                      clearInterval(intervalId);
                      resolve();
                    } else if (scannedResult.isScanned && !scannedResult.isSafe) {
                      console.log("scanned and had virus!!!!!!");
                      errorArray.push({
                        html: `${awaitingFile.uploadedFileName}, can't be uploaded due to having a virus`,
                        href: "#" + actionPath[1]
                      });
          
                      clearInterval(intervalId);
                      resolve();
                    } else if (counter >= 6) {
                      console.log("time out");
                      errorArray.push({
                        html: `${awaitingFile.uploadedFileName}, can't be uploaded due to Request time out`,
                        href: "#" + actionPath[1]
                      });
          
                      clearInterval(intervalId);
                      resolve();
                    }
          
                    counter += 1;
                  } catch (error) {
                    console.error("An error occurred:", error);
                    clearInterval(intervalId);
                    reject(error);
                  }
                }, 5000);
              });
            } catch (error) {
              console.error("An error occurred:", error);
            }
          }          
          const scannedFiles = [];
          for (const fileToUpload of newFilesArray) {
            try {
              const fileUploaded = await uploadFile(
                fileToUpload.fileBuffer,
                fileToUpload.uploadedFileName,
                actionPath[1]
              );
        
              if (fileUploaded.isUploaded) {
                scannedFiles.push(fileToUpload);
              }
            } catch (error) {
              console.error("An error occurred during upload:", error);
            }
          }
          if (scannedFiles.length) {
            formSubmitted = formSubmitted.multiForms[actionPath[1]]
              ? {
                  ...formSubmitted,
                  multiForms: {
                    ...formSubmitted.multiForms,
                    [actionPath[1]]: [
                      ...formSubmitted.multiForms[actionPath[1]],
                      ...scannedFiles
                    ]
                  }
                }
              : {
                  ...formSubmitted,
                  multiForms: {
                    ...formSubmitted.multiForms,
                    [actionPath[1]]: scannedFiles
                  }
                };
          }
        
          const allFilesErrors = errorArray.map((item) => item.html).join("<br/>");
        
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              [actionPath[1]]: allFilesErrors.length
                ? { html: allFilesErrors, href: "#" + actionPath[1] }
                : null
            }
          };
        
          const errorsSummary = errorArray.length
            ? createErrorsSummaryList(formSubmitted, errorArray, actionPath[1])
            : createErrorsSummaryList(formSubmitted, null, actionPath[1]);
        
          formSubmitted.errorSummaryList = errorsSummary;
        
          request.yar.set("formSubmitted", formSubmitted);
        
          return h.view(viewTemplate, formSubmitted);
        }
        

        
        

      }
    }
  }
];