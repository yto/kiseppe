const NOTICE_API = 'https://www.listasin.net/api/notice.cgi';

const save_options = async () => {
    try {
        const promises = [...document.querySelectorAll('#option-setting input')].map(e => {
            const value = (e.type == 'checkbox') ? e.checked : e.value;
            return chrome.storage.local.set({[e.id]: value});
        });
        await Promise.all(promises);
        console.log("Options saved successfully");
    } catch (error) {
        console.error("Failed to save options:", error);
    }
};

const load_options = () => 
      chrome.storage.local.get(null, (items) =>
          Object.keys(items).forEach(name => {
              const e = document.getElementById(name);
              if (!e) return;
              if (e.type == 'checkbox') e.checked = items[name];
              else e.value = items[name];
          })
      );

const init_options = () => {
    document.querySelectorAll('#option-setting input').forEach(e => {
        if (e.id == 'opt_bgcolor_hex') e.value = '#FF0000';
        else if (e.id == 'opt_jsdr_cutoff') e.value = '15';
        else if (e.id == 'opt_process_on_wishlist') e.checked = true;
        else if (e.type == 'checkbox') e.checked = false;
        else if (e.type == 'text') e.value = '';
        else e.value = '';
    });
    await save_options();
    load_options();
}

const show_storage = () =>
      chrome.storage.local.get(null, (items) => console.log(items));

async function get_notice() {
    const stamp = (new Date()).getUTCMinutes();
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    const browser = manifest.browser_specific_settings?.gecko ? 'firefox' : 'chrome';
    console.log(version, browser);
    const url = `${NOTICE_API}?stamp=${stamp}&version=${version}&browser=${browser}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Network response was not ok: ${response.statusText}`);
            return;
        }
        const json = await response.json();
        const noticeElement = document.getElementById('notice');
        if (noticeElement)
            noticeElement.textContent = json?.result?.str ?? '現在お知らせはありません。';
    } catch (error) {
        console.error(error, url);
        const noticeElement = document.getElementById('notice');
        if (noticeElement)
            noticeElement.textContent = "お知らせを取得できませんでした。";
    }
}

document.addEventListener('DOMContentLoaded', load_options);
document.addEventListener('DOMContentLoaded', get_notice);

[...document.querySelectorAll('input')].
    forEach(e => e.addEventListener('change', save_options));

document.getElementById('close_button').addEventListener('click', window.close);
document.getElementById('init_button').addEventListener('click', init_options);
document.getElementById('show_button').addEventListener('click', show_storage);
document.getElementById('clear_button').addEventListener('click', () => {
    if (window.confirm("すべての設定をリセットしますか？"))
        chrome.storage.local.clear();
});
