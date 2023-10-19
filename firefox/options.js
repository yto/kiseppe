function save_options() {
    document.querySelectorAll('#option-setting input').forEach(e => {
        const value = (e.type == 'checkbox') ? e.checked : e.value;
        chrome.storage.local.set({[e.id]: value});
    });
    window.close();
}

function load_options() {
    chrome.storage.local.get(null, (items) =>
        Object.keys(items).forEach(name => {
            const e = document.getElementById(name);
            if (!e) return;
            if (e.type == 'checkbox') e.checked = items[name];
            else e.value = items[name];
        })
    );
}

document.addEventListener('DOMContentLoaded', load_options);
document.getElementById('save_button').addEventListener('click', save_options);
document.getElementById('load_button').addEventListener('click', load_options);
document.getElementById('close_button').addEventListener('click', () =>
    window.close());
document.getElementById('initialize_button').addEventListener('click', () =>
    document.querySelectorAll('#option-setting input').forEach(e => {
	if (e.id == 'opt_bgcolor_hex') e.value = '#FF0000';
        else if (e.type == 'checkbox') e.checked = false;
	else e.value = '';
    })
);

/*
// localStorage はオプションページとターゲットページで異なるので使えない
function save_options() {
    document.querySelectorAll('#option-setting input').forEach(e => {
        const value = (e.type == 'checkbox') ? (e.checked ? 1 : 0) : e.value;
	localStorage.setItem(e.id, value);
    });
    //window.close();
}
function load_options() {
    Object.keys(localStorage).forEach(name => {
        const e = document.getElementById(name);
	const v = localStorage.getItem(name);
	console.log(name, v, e);
        if (!e) return;
        if (e.type == 'checkbox') e.checked = (v == 1);
        else e.value = v ?? '';
    })
}
*/

