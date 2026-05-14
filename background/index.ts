console.log("Background script loaded")

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message)
  
  if (message.action === "open_dashboard") {
    console.log("Opening dashboard...")
    chrome.tabs.create({ 
      url: chrome.runtime.getURL("tabs/dashboard.html"),
      active: true
    }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Error opening dashboard:", chrome.runtime.lastError.message)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        console.log("Dashboard opened successfully, tab id:", tab?.id)
        sendResponse({ success: true, tabId: tab?.id })
      }
    })
    return true
  }
})