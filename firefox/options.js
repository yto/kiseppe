const save_options = () =>
      document.querySelectorAll('#option-setting input').forEach(e => {
          const value = (e.type == 'checkbox') ? e.checked : e.value;
          chrome.storage.local.set({[e.id]: value});
      });

const load_options = () => 
      chrome.storage.local.get(null, (items) =>
          Object.keys(items).forEach(name => {
              const e = document.getElementById(name);
              if (!e) return;
              if (e.type == 'checkbox') e.checked = items[name];
              else e.value = items[name];
          })
      );

const init_options = () =>
      document.querySelectorAll('#option-setting input').forEach(e => {
          if (e.id == 'opt_bgcolor_hex') e.value = '#FF0000';
          else if (e.id == 'opt_jsdr_cutoff') e.value = "15";
          else if (e.type == 'checkbox') e.checked = false;
          else e.value = '';
      });

const show_storage = () =>
      chrome.storage.local.get(null, (items) => console.log(items));


document.addEventListener('DOMContentLoaded', load_options);

[...document.querySelectorAll('input')].
    forEach(e => e.addEventListener('change', save_options));

document.getElementById('close_button').
    addEventListener('click', () => window.close());
document.getElementById('init_button').
    addEventListener('click', () => init_options() || save_options());
document.getElementById('show_button').
    addEventListener('click', show_storage);
document.getElementById('clear_button').
    addEventListener('click', () => chrome.storage.local.clear());


