//
// for DEBUG
//
// show a debug-messeage-window on top-left
//
// usage:
//   const d = new KiseppeDebug();
//   d.log('hello');
//   d.log(100);
//   d.log({'name':'me', 'val':2}); // obj => "{...}"
//   d.log('hello', 12, true);
//   const d = new KiseppeDebug(false); // don't show
//
class DebugMessage {
    constructor(active = true) {
        this.active = active;
        if (active) this.#show_panel();
    }

    #show_panel() {
        this.disp_msg = document.createElement('span');
        this.disp_msg.id = 'debug_disp_msg';
        this.disp_msg.style.maxHeight = '6em';
        document.querySelector('body').prepend(this.disp_msg);

        this.disp_size_btn = document.createElement('button');
        this.disp_size_btn.id = 'debug_disp_size_btn';
        document.querySelector('body').prepend(this.disp_size_btn);
        document.querySelector('#debug_disp_size_btn').textContent = "d";
        document.querySelector('#debug_disp_size_btn').addEventListener(
            'click',
            () => {
                const e = document.querySelector('#debug_disp_msg');
                switch (e.style.maxHeight) {
                case '0px':
                    e.style.maxHeight = '6em';
                    e.style.display = 'block';
                    e.style.overflow = 'hidden';
                    break;
                case '6em':
                    e.style.maxHeight = '100%';
                    e.style.overflow = 'auto';
                    break;
                case '100%':
                    e.style.maxHeight = '0px';
                    e.style.display = 'none';
                }
                this.log(`set "max-height" as ${e.style.maxHeight}`);
            }
        );
    };

    log(...s) {
        console.log(...s);
        if (!this.active) return;
        const c = this.disp_msg;
        const [hms] = Date().match(/(([0-9]{2}:){2}[0-9]{2})/);
        const line = s.map(x =>
            (typeof(x)).match(/string|number|boolean/) ? x : '{...}'
        ).join(' ');
        c.innerHTML = `[${hms}] ${line}<br>${c.innerHTML}`;
    }
}
