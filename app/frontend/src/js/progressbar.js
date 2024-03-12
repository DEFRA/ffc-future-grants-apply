function uploadProgress( progressbarId, progressbarTextId, uploadedFilesClassName, progressBarContainerClassName) {
    const progressbarValue = document.getElementById(progressbarId);
    const progressbarText = document.getElementById(progressbarTextId);
    const uploadedFiles = document.getElementsByClassName(uploadedFilesClassName);
      const progressbarContainer = document.getElementsByClassName(progressBarContainerClassName)[0];
      progressbarContainer.classList.remove('hidden')
    const total = 90;
    let loaded = 0;
    const createLoading = setInterval(()=>{
      if(loaded < 90){
        loaded += 5;
        progressbarValue.value = loaded;
        progressbarText.innerText = `${loaded}%`;
      }else{
        clearInterval(createLoading);
      }
      if(uploadedFiles.length){
          progressbarContainer.classList.add('hidden')
      }
    },300)
    return
}
function handleButtonClick(button, progressbarId, progressbarTextId, uploadedFilesClassName, progressBarContainerClassName) {
button.addEventListener('click', (e) => {
    e.target.classList.add('hidden');
    const claimBtn = document.getElementById("claimItemsButton");
    const buttonsToDisable = [button, purchasedBtn, paidItemsBtn, inPlaceBtn, conditionsBtn];
    buttonsToDisable.forEach(btn => {
        if (btn && btn !== button) {
            btn.disabled = true;
        }
    });
    if(progressbarId !== "progressbar-claim" && claimBtn) {
      claimBtn.disabled = true
    }
    uploadProgress(progressbarId, progressbarTextId, uploadedFilesClassName, progressBarContainerClassName);
});
}
const purchasedBtn = document.getElementById("purchasedItemsButton");
const paidItemsBtn = document.getElementById("paidItemsButton");
const inPlaceBtn = document.getElementById("inPlaceItemsButton");
const conditionsBtn = document.getElementById("conditionsItemsButton");
handleButtonClick(purchasedBtn, "progressbar-purchased", "progress-text-purchased", "purchased-files", "progress-container-purchased");
handleButtonClick(paidItemsBtn, "progressbar-paid", "progress-text-paid", "paid-files", "progress-container-paid");
handleButtonClick(inPlaceBtn, "progressbar-inPlace", "progress-text-inPlace", "inPlace-files", "progress-container-inPlace");
handleButtonClick(conditionsBtn, "progressbar-conditions", "progress-text-conditions", "conditions-files", "progress-container-conditions");

const claimBtn = document.getElementById("claimItemsButton");
if (claimBtn) {
handleButtonClick(claimBtn, "progressbar-claim", "progressbar-text-claim", "claim-files", "progress-container-claim");
}