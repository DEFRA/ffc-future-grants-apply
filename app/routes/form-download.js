const urlPrefix = require("../config/index").urlPrefix;

module.exports = {
  method: "GET",
  path: `${urlPrefix}/download-forms`,
  options: {
    auth: false,
    handler: async (_, h) => {
      return h.view("form-download");
    },
  },
};
