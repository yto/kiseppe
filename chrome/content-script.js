
async function main() {

    const asinatsu_sleep = ms => new Promise(res => setTimeout(res, ms));

    //
    // Kindle ASIN page
    //
    // kiseppe 1.0 の main() を asin_page_main() をして呼び出す
    if (document.getElementById('ASIN')) {
	console.log("here is Kindle ASIN Page");
        const asin = document.getElementById('ASIN').value;
        if (asin.match(/^B[0-9A-Z]{9}$/m)) {
	    asin_page_main(); // call kiseppe 1.0

	    // コレクション ASIN の取得
	    // todo: コレクション API を呼び出す（未実装）
            let c = document.querySelector("a[href*='binding=kindle_edition']");
            if (c) {
                let r = c.getAttribute('href').match(/(B0[0-9A-Z]{8})/);
                let collection_asin = r[0];
                //// build API url and access
		const url = 'https://www.listasin.net/api/debug-logging.cgi?asins=COL_' + collection_asin + ',' + asin;
                console.log(url);
		try {
                    fetch(url).then(e => {console.log(e)});
		} catch (error) {
		    console.error(error);
		}
            }

	    return;
        }
    }

    //
    // is Kindle Matomegai Page?
    //
    // data-collection-asin="B0B3TFK9YX" 
    // data-ajax-url="...B074V5W2R7,B074V3V9W5,B074V5W5GT"
    if (document.querySelector('[data-collection-asin]')) {
	console.log("here is Kindle Matomegai Page");
        let collection_asin = document.querySelector('[data-collection-asin]').getAttribute('data-collection-asin');
        let aset = new Set();
        document.querySelectorAll('[data-ajax-url]').forEach(
            e => {
                const u = e.getAttribute('data-ajax-url');
                console.log(u);
                const r = u.match(/(B0[0-9A-Z]{8})/g);
                r.forEach(s => aset.add(s));
            }
        );
        let asins = Array.from(aset);
    
        //// build API url and access
	// todo: コレクション API を呼び出す（未実装）
	const url = 'https://www.listasin.net/api/debug-logging.cgi?asins=COL_' + collection_asin + ',' + asins;
	console.log(url);
	try {
	    fetch(url).then(e => {console.log(e)});
	} catch (error) {
	    console.error(error);
	}
        return;
    }

    //
    // is Kindle Search Page?
    //
    if (document.querySelector('div#search') &&
	document.querySelector('div#nav-subnav[data-category="digital-text"]')
       ) {
	console.log("here is Kindle Search Page");

	console.log("wait a few seconds");
	await asinatsu_sleep(2000);
	console.log("ok, go!");

	//// kiseppe API になげるための ASIN の収集とグラフボタンの設置
	let alist = [];
        let calist = [];
	document.querySelectorAll('div[data-asin][data-component-type="s-search-result"]').forEach(
            e => {
		let asin = e.dataset.asin;

		// kiseppe API になげるための ASIN の収集
		let seri = e.querySelector('div.a-row > a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style[href*="kindle_edition"]');
		if (seri) {
                    const r = seri.getAttribute('href').match(/\/(B0[0-9A-Z]{8})/);
		    calist.push("COL_" + r[1]);
		    calist.push(asin);
		} else {
		    alist.push(asin);
		}

		// グラフボタンの設置
		let item_title = e.querySelector('h2').textContent;
		let pgd = build_price_graph_dialog(asin, item_title);
		pgd.style.paddingRight = "3px";
		pgd.style.fontSize = "large";
		e.querySelector('h2').prepend(pgd);
	    }
        );
	// kiseppe API になげるための ASIN リスト
	let asins = [alist, calist].flat().join(",");

        // build API url
	const url = 'https://www.listasin.net/api/0001_jd.cgi?asins=' + asins;
        console.log(url);

	//// API になげてその結果を受けての処理
	await fetch(url).then(res => res.json()).then(v => {
	    console.log(v['res']);
	    // API の結果のそれぞれの ASIN について処理
	    Object.keys(v['res']).forEach(asin => {
		//console.log(asin);
		// 実質割引率 15% 以上のもののみ処理を行う
		if (v['res'][asin] && Number(v['res'][asin]) >= 15 ) {
		    // 実質割引率の表示エリア
		    let jh = document.createElement('span');
		    jh.style.position = "absolute";
		    jh.style.bottom = "1rem";
		    jh.style.right = "1rem";
		    jh.style.zIndex = "10000";
		    jh.innerHTML = `🉐実質<b>${v['res'][asin]}</b>%オフ`;

		    // 割引作品の背景色を変更する
		    const toumei = Number(v['res'][asin]) / 100 * 0.2;
		    const it = document.querySelector('div[data-asin="'+asin+'"]');
		    const c = it.querySelector('div[class^="s-card-container"] div[class$=s-list-col-right]');
		    c.style.backgroundColor = 'rgba(255,0,0,'+toumei+')';

		    // 表示エリアをページに表示
		    it.style.position = "relative";
		    it.prepend(jh);
		}
	    });
	});
	
	return;
    }

    //
    // is Kindle Store Page?
    //
    if (document.querySelector('#nav-subnav[data-category=digital-text]')) {
	console.log("here is Kindle Store Page");

	if (document.querySelector('div[class^="_octopus-search-result-card_"], div[class*="asin-container"]')) {
	    console.log("wait a few seconds");
	    await asinatsu_sleep(2000);
	    console.log("ok, go!");
	}

	// get all ASINs
        let aset = new Set();
        document.querySelectorAll("a[href]").forEach(e => {
            const r = e.getAttribute('href').match(/\/(B0[0-9A-Z]{8})/);
            if (r) aset.add(r[1]);
        });
        console.log(aset.size, aset);
        let asins = Array.from(aset);

	// octopus_search トップにいくつか表示されるやつ の ASIN のみ取り出す
	// Ex. https://www.amazon.co.jp/b?node=22083216051
	const sr_asins = asins.filter(asin => 
	    document.querySelector(`h2 a[href*="/dp/${asin}"],a[href*="/dp/${asin}"] h2`));
	console.log(sr_asins, sr_asins.length);
	let apires = {};
	if (sr_asins.length > 0) {
            //// build API url and access
	    const url = 'https://www.listasin.net/api/0001_jd.cgi?asins=' + sr_asins;
            console.log(url);
            apires = await fetch(url).then(res => res.json());
	} else { // search result 無いとき
            //// build API url and access
	    const url = 'https://www.listasin.net/api/debug-logging.cgi?asins=' + asins;
            console.log(url);
	    try {
		apires = await fetch(url).then(res => res.json())
	    } catch (error) {
		console.error(error);
	    }
	}

	asins.forEach(asin => {
	    // グリッド表示
	    // Ex. https://www.amazon.co.jp/kindle-dbs/browse?metadata=cardAppType&storeType=ebooks&sourceType=recs&widgetId=unified-ebooks-storefront-default_KindleUnlimitedCrossCategoryStrategyEbookSources
	    // 横スクロール表示
	    // Ex. https://www.amazon.co.jp/kindle-dbs/storefront?storeType=browse&node=2275256051
	    // octopus_search トップにいくつか表示されるやつ
	    // Ex. https://www.amazon.co.jp/b?node=22083216051
	    // セール＆キャンペーンなどで表示される検索結果表示
	    // Ex. https://www.amazon.co.jp/b?node=22083216051
	    Array.from(document.querySelectorAll(`a[href^="/gp/product/${asin}"]`)).forEach(e => {
		//console.log('heheh', asin, e);
		let item_title = '';
		if (e.getAttribute('aria-label'))
		    // for グリッド表示
		    item_title = e.getAttribute('aria-label')
		else if (e.querySelector('img[alt][data-a-dynamic-image]'))
		    // for 横スクロール表示
		    item_title = e.querySelector('img[alt][data-a-dynamic-image]').getAttribute('alt');
		//console.log(e.parentNode.textContent);
		if (item_title && ! /📊/.test(e.parentNode.textContent)) {
		    let pgd = build_price_graph_dialog(asin, item_title);
		    e.parentNode.insertBefore(pgd, e.nextSibling);
		}
	    });

	    // 横並びだけどスクロールしないやつ
	    // Ex. https://www.amazon.co.jp/b?node=2292699051
	    Array.from(document.querySelectorAll(`li span[class="a-list-item"] a[href*="/dp/${asin}"]`)).forEach(e => {
		//console.log('bebe', asin, e);
		let item_title = '';
		if (e.querySelector('img[alt]'))
		    item_title = e.querySelector('img[alt]').getAttribute('alt');
		if (item_title) {
		    let pgd = build_price_graph_dialog(asin, item_title);
		    //e.parentNode.insertBefore(pgd, e.nextSibling);
		    pgd.style.position = "absolute";
		    pgd.style.bottom = "1rem";
		    pgd.style.right = "1rem";
		    pgd.style.zIndex = "10000";
		    let c = e.closest('li');
		    c.style.position = "relative";
		    if (! /📊/.test(c.textContent)) c.appendChild(pgd);
		}
	    });

	    // octopus_search: トップにいくつか表示されるやつ
	    // Ex. https://www.amazon.co.jp/b?node=22083216051
	    if (document.querySelector(`h2 a[href*="/dp/${asin}"]`)) {
		let e = document.querySelector(`h2 a[href*="/dp/${asin}"]`)
		let item_title = e.textContent;
		if (item_title) {
		    let pgd = build_price_graph_dialog(asin, item_title);
		    pgd.style.paddingRight = "3px";
		    pgd.style.fontSize = "large";
		    e.parentNode.prepend(pgd);

		    if (apires['res'][asin] && Number(apires['res'][asin]) >= 15 ) {
			// 割引作品の背景色を変更する
			let c = e.closest('div[class*="s-card-container"]');
			const toumei = Number(apires['res'][asin]) / 100 * 0.2;
			c.style.backgroundColor = 'rgba(255,0,0,'+toumei+')';

			//
			let jh = document.createElement('div');
			jh.innerHTML = `🉐実質<b>${apires['res'][asin]}</b>%オフ`;
			jh.style.textAlign = 'right';
			jh.style.marginTop = '0.5rem';
			//e.parentNode.prepend(jh);
			e.parentNode.parentNode.parentNode.appendChild(jh);
		    }
		}
	    }

	    // セール＆キャンペーンなどで表示される検索結果表示
	    // Ex. https://www.amazon.co.jp/b?node=22083216051
	    if (document.querySelector(`div[class*="asin-container"] a[href*="/dp/${asin}"]`)) {
		console.log('kekek');
		let e = document.querySelector(`div[class*="asin-container"] a[href*="/dp/${asin}"]`);
		item_title = e.querySelector('img[alt]').getAttribute('alt');
		let pgd = build_price_graph_dialog(asin, item_title);
		e.closest('div[class*="asin-container"]').style.position = "relative";
		e.closest('div[class*="asin-container"]').appendChild(pgd);
		pgd.style.position = "absolute";
		pgd.style.bottom = "0.1rem";
		pgd.style.left = "0.1rem";
		pgd.style.zIndex = "10000";

		if (apires['res'][asin] && Number(apires['res'][asin]) >= 15 ) {
		    // 割引作品の背景色を変更する
		    let c = e.closest('div[class*="asin-container"]');
		    const toumei = Number(apires['res'][asin]) / 100 * 0.3;
		    c.style.background = 'linear-gradient(rgba(255,0,0,'+toumei+'), white)';

		    let jh = document.createElement('div');
		    jh.innerHTML = `🉐<br>実質<br><b>${apires['res'][asin]}%</b><br>オフ`;
		    jh.style.position = "absolute";
		    jh.style.bottom = "0.1rem";
		    jh.style.right = "0.3rem";
		    jh.style.border = "1px solid brown";
		    jh.style.padding = "0.1rem 0.2rem";
		    jh.style.fontSize = "small";
		    jh.style.lineHeight = "1.05em";
		    e.closest('div[class*="asin-container"]').appendChild(jh);

		}


	    }



	});

	return;
    }

};

main();


//
// price graph の dialog を作る
// (generates a dialog to display a Price Graph iframe)
//
function build_price_graph_dialog(asin, title) {
    //console.log('hello');

    // 表示ボタン
    let d = document.createElement('span');
    d.style.zIndex = "100000";
    d.style.cursor = "pointer";
    d.innerText = '📊';
    
    // クリックしたらグラフなどを表示
    d.addEventListener('click', (event) => {
	//console.log('hello in');
	
	//// build API url (returns a web page for iframe)
	const url = 'https://www.listasin.net/api/0000/chex/' + asin + '--';
	console.log(url);

	let pp = document.getElementById("popup_modal");
	if (! pp) {
	    pp = document.createElement('dialog');
	    pp.id = "popup_modal";
	    pp.style.border = "none";
	    pp.style.borderRadius = "8px";
	    pp.addEventListener('click', (e) => {
		if (e.target.closest('#price_graph_container') === null) pp.close();
	    });
	    document.querySelector("noscript").before(pp);
	}

	pp.innerHTML = `
<style>
dialog#popup_modal::backdrop { background: rgba(0,0,0,.5); }
</style>
<div id="price_graph_container" style="width: 850px; text-align: center;">
<div style="height: 400px;">
<div style="font-weight: bold; margin-bottom: 0.5rem;
text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
">${title}</div>
<iframe style="width: 100%; height: 100%; border: 0; overflow: visible;" src="${url}" scrolling="no"></iframe>
</div>
<button onclick="document.getElementById('popup_modal').close()">Close</button>
</div>
`;
	document.getElementById("popup_modal").showModal();

	event.stopPropagation();
    });

    return d;
}


//
// ASIN ページに price graph を表示する (kiseppe 1.0 の main())
// (inserts a Price Graph iframe in an ASIN page)
//
function asin_page_main() {

    //// iframeの高さを得る（あとで）
    window.addEventListener('message', function(e) {
        var iframe = document.getElementById("kiseppe");
        switch(e.data[0]) { // event name
        case 'setHeight':
            iframe.style.height = e.data[1] + "px";
            break;
        }
    }, false);

    //// 確認事項

    // Kindle本のページであるか
    if (! document.getElementById('nav-search-label-id')) return;
    if (! document.getElementById('nav-search-label-id').textContent.match(/Kindle/m)) return;

    // ASINがあるか
    if (! document.getElementById('ASIN')) return;
    const asin = document.getElementById('ASIN').value;
    if (! asin.match(/^B[0-9A-Z]{9}$/m)) return;
    console.log("kisepa: " + asin);

    //// Amazonページから価格を取得
    let _pr = document.getElementById('youPaySection');
    let price = _pr ? _pr.getAttribute('data-kindle-price').replace(/\.0$/, '') : '';
    // 期間限定無料＆kindle unlimited のとき？
    if (price == '') {
        _pr = document.getElementById('kindle-price');
        if (_pr) price = _pr.textContent.match(/([0-9,]+)/m)[1].replace(/,/g, '');
    }

    //// Amazonページから還元ポイントを取得
    let _po = Array.from(document.getElementsByClassName('total-points-value-display-column')).map(x => x.textContent).join('').match(/\+([0-9,]+) /m);
    let point = _po ? _po[1] : '';
    // 期間限定無料＆kindle unlimited のとき？
    if (point == '') {
        _po = document.getElementById('Ebooks-desktop-KINDLE_ALC-prices-loyaltyPoints');
        if (_po) point = _po.textContent.match(/ ([0-9,]+)/m)[1].replace(/,/g, '');
    }

    //// build API url (returns a web page for iframe)
    const url = 'https://www.listasin.net/api/0000/chex/' + asin + '-' + price + '-' + point;
    console.log(url);

    //// グラフの表示

    // iframeを作る
    let new_elm = document.createElement('div');
    new_elm.innerHTML = '<iframe style="width: 100%; height: 0px; border: 0; overflow: hidden;" src="' + url + '" scrolling="no" id="kiseppe"></iframe>';

    // iframeを挿入する
    let base_elm = document.getElementById('ATFCriticalFeaturesDataContainer');
    base_elm.after(new_elm);
};

