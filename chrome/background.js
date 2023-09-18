chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' &&
	tab.url.indexOf('https://www.amazon.co.jp') > -1) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-script.js'],
        });
    }
});

