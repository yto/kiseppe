// Kiseppe's target pages
//
// Pages:
// - Kindle ASIN Page
//   - insert:[price-graph-iframe][series-jsdr]
// - Kindle Series Page
//   - insert:[price-graph-button][item-jsdr][series-jsdr]
//   - observe
// - Kindle Search Page
//   - insert:[price-graph-button][item-jsdr][series-jsdr]
//   - observe
//   - wait
// - Kindle Author Page
//   - Kindle Author Component
//   - Kindle Horizontal Component
//     - observe
// - Kindle Ranking Page
//   - insert:[price-graph-button][item-jsdr]
//   - observe
// - Kindle Grid30 Page
//   - insert:[price-graph-button][item-jsdr]
// - Kindle Octopus Page
//   - Kindle Horizontal Component
//   - Kindle Octopus Component
// - Kindle Grid12 Page
//   - Kindle Horizontal Component
//   - Kindle Grid12 Component
//     - observe
// - Kindle Manga Store Page
//   - Kindle Horizontal Component
//     - observe
// - Kindle Store Page (others)
//   - Kindle Horizontal Component
//
// Components:
// - Kindle Author Component
//   - [price-graph-button][item-jsdr]
// - Kindle Octopus Component
//   - [price-graph-button][item-jsdr][series-jsdr]
// - Kindle Grid12 Component
//   - [price-graph-button][item-jsdr]
// - Kindle Horizontal Component
//   - General Carousel
//     - [price-graph-button]
//   - Manga Store Ranking Carousel
//     - [price-graph-button]

const KS_IF_API = 'https://www.listasin.net/api/0000/chex/'; // iframe
const KS_JD_API = 'https://www.listasin.net/api/0199_jd.cgi?asins='; // json
const DEBUG_API = 'https://www.listasin.net/api/debug-logging.cgi?asins=';
const JSDR_CUTOFF = 15;

// Words
// - KS means Kiseppe or Kinseli
// - JSDR means real discount rate (実質割引率)


// ページの種類は判定して処理を割り当てる
// 動的に内容が変化するページには observer を使う
async function main() {

    const config = { childList: true, subtree: true };
    const generate_callback = (e, f) => async function (mutations, observer) {
        observer.disconnect(); // stop observation
        console.log('stop obervation, do something important');
        await f();
        console.log('restart observation');
        observer.observe(e, config); // restart observation
    };
    const generate_callback_ex = (e, qs, f) => async function (mutations, observer) {
        const exs = Array.from(e.querySelectorAll(qs));
        let is_mutation_detected = 0;
        for (let mu of mutations) {
            if (exs.filter(x => x.contains(mu.target)).length)
		continue; // mutation is under the node qs => ignore changes
            is_mutation_detected = 1;
            break;
        }
        if (! is_mutation_detected) return;
        const f2 = generate_callback(e, f);
        f2(mutations, observer);
    };

    if (document.getElementById('ASIN')) {

        console.log("kiseppe: here is Kindle ASIN Page");
        kindle_asin_page();

    } else if (document.querySelector('div[id="browse-views-area"] div[class*="browse-clickable-item"]')) {

        console.log("kiseppe: here is Kindle Grid30 Page");
        kindle_grid30_page();

    } else if (document.querySelector('[data-card-metrics-id*="octopus-search-result-card_"')) {

        console.log("kiseppe: here is Kindle Octpus Page");
        kindle_horizontal_component();
        kindle_octopus_component();

    } else if (/一覧.+著者/.test(document.querySelector('title').textContent)) {

        console.log("kiseppe: here is Kindle Author Page");
        await kindle_horizontal_component();
        kindle_author_component();

        const e = document.querySelector('#authorPageBooks');
        const callback = generate_callback(e, kindle_horizontal_component);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);
        
    } else if (document.querySelector('div[class*="result-section"]') &&
               document.querySelector('div[id=search-results]')) {

        console.log("kiseppe: here is Grid12 Page");
        kindle_horizontal_component();
        await kindle_grid12_component();

        const e = document.querySelector('div[id=search-results]').parentNode;
        const callback = generate_callback(e, kindle_grid12_component);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector(
	'[data-entity-id][data-type=collection], [data-collection-asin]'
    )) {

	// document.querySelector('#series-follow-button') ^^^
	// document.querySelector('[data-collection-asin]') XXX

        console.log("kiseppe: here is Kindle Series Page");
        await kindle_series_page();

        const e = document.querySelector('div[id=series-childAsin-widget]');
        const callback =
              generate_callback_ex(e, '#countdown_timer', kindle_series_page);
        // #countdown_timer : 終了までXXXXX秒
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector('div#nav-subnav[data-category="digital-text"]') &&
               document.querySelector('div#search')) {

        console.log("kiseppe: here is Kindle Search Page");
        await kindle_search_page();
        
        const e = document.querySelector('div#search');
        const callback = generate_callback(e, kindle_search_page);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (/(new-releases|bestsellers|movers-and-shakers)\/digital-text/.test(location.href)) {

        console.log("kiseppe: here is Kindle Ranking Page");
        await kindle_ranking_page();

        const e = document.querySelector('div.p13n-desktop-grid');
        const callback = generate_callback(e, kindle_ranking_page);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (/manga-store/.test(location.href)) {

        console.log("kiseppe: here is Kindle Manga Store Page");
        kindle_horizontal_component();

        const e = document.querySelector('.msw-page');
        const callback = generate_callback_ex(
            e,
            'div[data-csa-c-painter="banner-carousel-cards"]',
            kindle_ranking_page
        );
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector('#nav-subnav[data-category=digital-text]')) {

        console.log("kiseppe: here is Kindle Store Page (Others)");
        kindle_horizontal_component();

    } else {

    }
}

main();


// ページやコンポーネント（ページ内の一部分）ごとの処理を行う関数たち
// functions to process page or component (a part of HTML page)
//
// - parse HTML
//   - get ASINs, title, series ASIN
//   - put graph button
// - do API access
// - display jsdr information
//   - put jsdr badge, change background


//// Kindle ASIN page
// Ex. https://www.amazon.co.jp/dp/B0C5QMW1JY
async function kindle_asin_page() {
    const asin = document.getElementById('ASIN').value;
    if (! /^B[0-9A-Z]{9}$/.test(asin)) return;
    
    // call kiseppe 1.0 (kiseppe1.0::main() => asin_page_main())
    asin_page_main();

    const [srasin, c] = get_series_asin(document.body);
    if (! srasin) return;

    // API access
    const url = `${KS_JD_API}COL_${srasin},${asin}`;
    const res = await access_api(url);
    if (!res || !res['result']) return;

    // display jsdr information
    const sr_jsdr = get_series_jsdr(srasin, res);
    if (sr_jsdr >= JSDR_CUTOFF) show_series_sale_badge(c);

    return;
}


//// Kindle Author Component
// Ex. https://www.amazon.co.jp/kindle-dbs/entity/author/B004L41ULY
async function kindle_author_component() {

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const alist = [];
    document.querySelectorAll(
        'div[id=searchWidget] > div:not([role])'
    ).forEach(cntn => {
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        const c = cntn.querySelector('a[aria-label][href*="/B"]');
        if (! c) return; // not Kindle book
        const asin = get_asin_in_href(c);
        alist.push(asin);
        cntn.dataset.asin = asin;
        const item_title = c.getAttribute('aria-label');
        const pinfo = extract_price_and_point(cntn);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(cntn, asin, item_title, pinfo);
    });
    if (alist.length == 0) return;

    // API access
    const url = KS_JD_API + alist.join(",");
    const res = await access_api(url);
    if (!res || !res['result']) return;

    // display jsdr information
    Object.keys(res['result']['books']).forEach(asin => {
        const cntn = document.querySelector(`div[data-asin=${asin}]`);
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr >= JSDR_CUTOFF) {
            const ca = cntn.querySelector('a[aria-label]');
            show_jsdr_badge(ca, jsdr, "0", "0");
            change_background_color(cntn, jsdr);
        }
    });

    return;
}


//// Kindle Grid30 Page
// グリッド表示
// Ex. https://www.amazon.co.jp/kindle-dbs/browse?metadata=cardAppType&storeType=ebooks&sourceType=recs&widgetId=unified-ebooks-storefront-default_KindleUnlimitedCrossCategoryStrategyEbookSources
async function kindle_grid30_page() {
    const qs_grid30 = 'div[id="browse-views-area"] div[class*="browse-clickable-item"]';

    // get all ASINs
    const a2pinfo = {};
    const aset = new Set();
    document.querySelectorAll(qs_grid30).forEach(e => {
        const le = e.querySelector('a[href^="/gp/product/B"][aria-label]');
        const asin = get_asin_in_href(le);
        if (! asin) return;
        aset.add(asin);
        const item_title = le.getAttribute('aria-label');
        const pinfo = extract_price_and_point(e);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(e, asin, item_title, pinfo);
    });
    console.log("aset:", aset.size, aset);
    const asins = Array.from(aset);
    if (asins.length <= 0) return;
    
    // API access
    const url = KS_JD_API + asins.flat().join(",");
    const res = await access_api(url);
    if (!res || !res['result']) return;

    // display jsdr information
    Object.keys(res['result']['books']).forEach(asin => {
	const e = document.querySelector(
            qs_grid30 + ` a[href^="/gp/product/${asin}"][aria-label]`
        );
        console.log(asin, e);
        const cntn = e.closest('div[class*="browse-clickable-item"]');
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr >= JSDR_CUTOFF) {
            show_jsdr_badge(cntn, jsdr, "0", "0");
            change_background_color(cntn, jsdr, 'g');
        }
    });
    
    return;
}


//// Kindle Octopus Component
// 特設ページなどの下の方に12個固定で表示されるやつ
// Ex. https://www.amazon.co.jp/b?node=22083216051
async function kindle_octopus_component() {
    let e = document.querySelector('[data-card-metrics-id*="octopus-search-result-card_"');

    console.log('octopus');
    // get all ASINs

    const a2pinfo = {};
    const aset = new Set();
    const aslist = [];
    const calist = [];
    e.querySelectorAll("h2 a[href]").forEach(e => {
        const asin = get_asin_in_href(e);
        if (! asin) return;
        const cntn = e.closest('div[class*="s-card-container"]');
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        const [srasin, seri] = get_series_asin(cntn);
        if (srasin) calist.push(...['COL_' + srasin, asin]);
        else aslist.push(asin);
        aset.add(asin);
        const pinfo = extract_price_and_point(cntn);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(cntn, asin, e.textContent, pinfo);
    });
    if (aset.size <= 0) return;

    // access to API
    const url = KS_JD_API + [aslist, calist].flat().join(",");
    const res = await access_api(url);
    if (!res || !res['result']) return;
    
    // display jsdr information
    Object.keys(res['result']['books']).forEach(asin => {
        const e = document.querySelector(`h2 a[href*="/dp/${asin}"]`);
        if (! e) return;
        console.log('kiseppe: octopus-component', asin);
        const cntn = e.closest('div[class*="s-card-container"]');
        const [srasin, seri] = get_series_asin(cntn);
        const sr_jsdr = get_series_jsdr(srasin, res);
        if (sr_jsdr >= JSDR_CUTOFF) show_series_sale_badge(seri);
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr >= JSDR_CUTOFF) {
            show_jsdr_badge(cntn, jsdr, "0", "0");
            change_background_color(cntn, jsdr);
        }
    });

    return;
}


//// Kindle Grid12 Component
// 「セール＆キャンペーン」ページなどで表示される検索結果表示
// Ex. https://www.amazon.co.jp/hko/deals/?_encoding=UTF8
async function kindle_grid12_component() {
    let e = document.querySelector('div[id=search-results]').parentNode;
    // get all ASINs
    const a2pinfo = {};
    const aset = new Set();
    document.querySelectorAll('div[class*="asin-container"] a[href]').forEach(e => {
        const asin = get_asin_in_href(e);
        if (! asin) return;
        aset.add(asin);
        const c = e.closest('div[class*="asin-container"]');
        if (c.querySelector('.kiseppe-pg-btn')) return;
        const item_title = e.querySelector('img[alt]').getAttribute('alt');
        const pinfo = extract_price_and_point(c);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(c, asin, item_title, pinfo);
    });
    console.log("aset:", aset.size, aset);
    const asins = Array.from(aset);
    if (asins.length <= 0) return;

    // access to API
    const url = KS_JD_API + asins;
    const res = await access_api(url);
    if (!res || !res['result']) return;

    // display jsdr information
    Object.keys(res['result']['books']).forEach(asin => {
        if (e = document.querySelector(
            `div[class*="asin-container"] a[href*="/dp/${asin}"]`
        )) {
            console.log('kiseppe: Grid12', asin);
            const c = e.closest('div[class*="asin-container"]');
            const jsdr = get_jsdr(asin, res, a2pinfo);
            if (jsdr >= JSDR_CUTOFF) {
                show_jsdr_badge(c, jsdr, "0", "0");
                change_background_color(c, jsdr, 'g');
            }
        }
    });
    return;
}


//// Kindle Series Page
// ("collection" means "series")
async function kindle_series_page() {
    let srasin;
    let e = document.querySelector('[data-entity-id][data-type=collection]');
    if (e) srasin = e.dataset.entityId;
    if (! srasin) {
	e = document.querySelector('[data-collection-asin*="B"]');
	if (e) srasin = e.dataset.collectionAsin;
    }
    if (! srasin) return;

    const a2pinfo = {};
    const aset = new Set();
    // Ex. data-ajax-url="...B074V5W2R7,B074V3V9W5,B074V5W5GT"
    document.querySelectorAll('[data-ajax-url*="B"]').forEach(e => {
        const r = e.getAttribute('data-ajax-url').match(/(B[0-9A-Z]{9})/g);
        r.forEach(s => aset.add(s));
    });
    // all items (in this series) displayed on this page
    document.querySelectorAll('div[id^="series-childAsin-item_"]').forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;
        const co = e.querySelector(`a[class*="itemImageLink"][role="img"]`);
        const asin = get_asin_in_href(co);
        if (! asin) return;
        aset.add(asin);
        item_title = co.getAttribute('title');
        const pinfo = extract_price_and_point(e);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(e, asin, item_title, pinfo);
    });
    console.log(aset);
    const asins = Array.from(aset);

    // access to API
    const url = `${KS_JD_API}COL_${srasin},${asins}`;
    const res = await access_api(url);
    if (!res || !res['result']) return;

    // display jsdr information
    const sr_jsdr = get_series_jsdr(srasin, res);
    if (sr_jsdr >= JSDR_CUTOFF) {
        let c = document.getElementById('collection-masthead__title');
        if (! c) c = document.getElementById('collection-title');
        if (c) show_series_sale_badge(c.parentNode);
    }
    Object.keys(res['result']['books']).forEach(asin => {
        const co = document.querySelector(`a[href*="${asin}"][role="img"]`);
        if (! co) return;
        const cntn = co.closest('div[id^="series-childAsin-item_"]');
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr >= JSDR_CUTOFF) {
            show_jsdr_badge(co, jsdr, "0", "-4px");
            change_background_color(cntn, jsdr);
        }
    });

    return;
}


//
// Kindle Ranking Page
//
// Ex. https://www.amazon.co.jp/gp/new-releases/digital-text/
// Ex. https://www.amazon.co.jp/gp/bestsellers/digital-text/
// Ex. https://www.amazon.co.jp/gp/movers-and-shakers/digital-text/
async function kindle_ranking_page() {

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const alist = [];
    document.querySelectorAll('div[id^="p13n-asin-index-"]').forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;
        const co = e.querySelector('div[class^="p13n-sc-un"]');
        const asin = co.id;
        const item_title = co.querySelector('img').getAttribute('alt');
        alist.push(asin);
        const pinfo = extract_price_and_point(e);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(e, asin, item_title, pinfo);
    });
    const asins = alist.join(",");
    if (asins.length < 1) return

    // access to API
    const url = KS_JD_API + asins;
    const res = await access_api(url);
    if (!res || !res['result']) return;

    // display jsdr information
    Object.keys(res['result']['books']).forEach(asin => {
        const co = document.querySelector(`div[id="${asin}"]`);
        const cntn = co.closest('div[data-a-card-type]');
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr >= JSDR_CUTOFF) {
            show_jsdr_badge(co, jsdr, "0", "0");
            change_background_color(cntn, jsdr);
        }
    });

    return;
}


//// Kindle Search Page
// Ex. https://www.amazon.co.jp/s?rh=n%3A2410280051&fs=true
async function kindle_search_page() {

    const asinatsu_sleep = ms => new Promise(res => setTimeout(res, ms));

    console.log("wait a few seconds");
    await asinatsu_sleep(2000);
    console.log("ok, go!");

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const aslist = [];
    const calist = [];
    document.querySelectorAll(
        'div[data-asin][data-component-type="s-search-result"]'
    ).forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;

        const asin = e.dataset.asin;
        if (! asin) return;

        const [srasin, seri] = get_series_asin(e);
        if (srasin) calist.push(...['COL_' + srasin, asin]);
        else aslist.push(asin);

        const item_title = e.querySelector('h2').textContent;
        const c = e.querySelector('div[cel_widget_id]');
        const pinfo = extract_price_and_point(e);
        a2pinfo[asin] = pinfo;
        put_price_graph_button(c, asin, item_title, pinfo);
    });
    const asins = [aslist, calist].flat().join(",");
    if (asins.length < 1) return;

    // access to API
    const url = KS_JD_API + asins;
    const res = await access_api(url);
    if (!res || !res['result']) return;
    
    // access to API
    Object.keys(res['result']['books']).forEach(asin => {
        const cntn = document.querySelector('div[data-asin="'+asin+'"]');

        const [srasin, seri] = get_series_asin(cntn);
	const sr_jsdr = get_series_jsdr(srasin, res);
	if (sr_jsdr >= JSDR_CUTOFF) show_series_sale_badge(seri);

	const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr >= JSDR_CUTOFF) {
            const x = cntn.querySelector('img').closest('.sg-col-inner');
            show_jsdr_badge(x, jsdr, "4px", "0");
            const c = cntn.querySelector('div[cel_widget_id]');
            change_background_color(c, jsdr);
            const b = cntn.querySelector('div[class*="-badge-container"]');
            if (b) change_background_color(b, 0);
        }
    });
    
    return;
}


//// Kindle Horizontal Component
async function kindle_horizontal_component() {

    // manga store ranking carousel
    const qs_rk = 'div[class^="_manga-genre-ranking-card_style_grid-container"]';
    if (document.querySelector(qs_rk)) {
        console.log('kiseppe: manga-store ranking area');
        const ca = document.querySelector(qs_rk);
        //// manga-store ranking area
        // マンガストアトップ ランキング横スクロール表示
        // Ex. https://www.amazon.co.jp/kindle-dbs/manga-store/
        ca.querySelectorAll(
            'a[href*="/dp/B"] img[class*="_manga-genre-ranking-card_retail-item-style_book-cover"]'
        ).forEach(e => {
            ca.classList.add('kiseppe-debug');

            const cntn = e.closest('div[id^="grid-item_"]');
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            // vvv  manga-store mateba-muryou's likes icon
            if (cntn.querySelector('img[alt="likes icon"]')) return;

            const asin = get_asin_in_href(e.closest('a'));
            const item_title = e.getAttribute('alt')
            const pinfo = extract_price_and_point(cntn);
            put_price_graph_button(cntn, asin, item_title, pinfo);
        });
    }

    // general carousel
    // カテゴリTOP: div[class*="octopus-pc-card-content"]
    // ASIN page: %2Fdp%2FB00JGI56B0%2F
    const qs_carousel =
          'div[class*="a-carousel-row-inner"], ' +
          'div[class*="octopus-pc-card-content"]'
    document.querySelectorAll(qs_carousel).forEach(ca => {
        console.log('kiseppe: horizontal');
        ca.classList.add('kiseppe-debug');

        //// horizontal
        // キンドルトップ横スクロール表示
        // Ex. https://www.amazon.co.jp/s?node=2275256051
        // 横並びだけどスクロールしないやつ
        // Ex. https://www.amazon.co.jp/b?node=2292699051
        ca.querySelectorAll('li a[href*="/dp/B"] img[alt], ' +
                            'li a[href^="/gp/product/B"] img[alt], ' + 
                            'li a[href*="%2Fdp%2FB"] img[alt]'
        ).forEach(e => {

            if (/image-ku/.test(e.getAttribute('src'))) return;
            let cntn = e.closest('div[class^="_manga-store-shoveler_style_item-row-"]'); // two rows
            if (! cntn) cntn = e.closest('li');
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            // vvv  manga-store big banner
            if (/banner-/.test(cntn.getAttribute("class"))) return;
            // vvv  manga-store mateba-muryou's likes icon
            if (cntn.querySelector('img[alt="likes icon"]')) return;                
            // vvv  manga-store collection ASIN
            if (cntn.querySelector('span[class*="collection-type"]')) return;
            // vvv ASIN page non-kindle-books
            if (cntn.querySelector('[class*="a-icon-prime"]')) return;
            if (cntn.querySelector('[data-endtime]')) return;

            const asin = get_asin_in_href(e.closest('a'));
            const item_title = e.getAttribute('alt')
            const pinfo = extract_price_and_point(cntn);
            put_price_graph_button(cntn, asin, item_title, pinfo);
        });
    });
    
    return;
};


//// Miscellaneous Small Functions
function get_asin_in_href(e) {
    if (! e || ! e.getAttribute('href')) return '';
    const r = e.getAttribute('href').match(/(B[0-9A-Z]{9})/);
    return r ? r[1] : '';
}
function get_series_asin(e) {
    const c = e.querySelector("a[href*='binding=kindle_edition']");
    const srasin = get_asin_in_href(c);
    return [srasin, c];
}
function change_background_color(e, v, mode = "") { // 0 <= v <= 100
    const toumei = v / 100 * 0.2;
    const rgba = `rgba(255,0,0,${toumei})`;
    if (mode == 'g') e.style.background = `linear-gradient(${rgba}, 90%, white)`;
    else e.style.backgroundColor = rgba;
}
function get_series_jsdr(srasin, apires) {
    if (!apires || !apires['result'] || !apires['result']['series']) return 0;
    const as = apires['result']['series'];
    if (!(srasin in as)) return 0;
    return Number(as[srasin]);
}
function get_jsdr(asin, apires, pp={}) {
    if (!apires || !apires['result'] || !apires['result']['books']) return 0;
    const ar = apires['result']['books'];
    if (!(asin in ar)) return 0;
    if ((asin in pp) && ('price' in pp[asin]) && ('point' in pp[asin])) {
        let price = Number(pp[asin]['price']);
        let point = Number(pp[asin]['point']);
        if (price != Number(ar[asin]['latest_price']) ||
            point != Number(ar[asin]['latest_point'])) {
            const max_price = Number(ar[asin]['max_price']);
            const jp = price - point;
            if (max_price == 0) return 0;
            else return Math.ceil((max_price - jp) / max_price * 100);
        }               
    }
    return Number(ar[asin]['jsdr']);
}
function extract_price_and_point(e) {
    let price;
    let point;
    let r;
    const s = e.innerHTML;
    if (r = s.match(/￥\s*(([0-9]{1,3})(,[0-9]{3})*)/)) {
        price = r[1].replaceAll(',', '');
        console.log(r[0]);
    }
    if (r = s.match(/([0-9]+)(ポイント|pt)/)) {
        point = r[1];
        console.log(r[0]);
    }
    if (e.querySelector('.a-icon-kindle-unlimited')) { // または、￥1,000で購入
        if (r = s.match(/または、￥(([0-9]{1,3})(,[0-9]{3})*)で購入/)) {
            price = r[1].replaceAll(',', '');
            console.log(r[0]);
        }
    }
    console.log([price, point]);
    return {'price': price, 'point': point};

    // ranking:
    // querySelectorAll('.a-color-price') x 2
    // <span class="a-size-base a-color-price"><span class="_cDEzb_p13n-sc-price_3mJ9Z">￥1,584</span></span>
    // <span class="a-size-base a-color-price">16ポイント(1%)</span>

    // horizontal(basic?):
    // <span class="a-size-base a-color-price">￥ 499</span>
    // <span class="a-size-base a-color-price">5pt</span>
    // <span class="a-size-base a-color-price">(1%)</span>

    // grid30
    // <span class="a-color-price a-text-bold">￥ 814</span>
    // <span class="a-list-item a-size-small"> <span class="a-color-price a-text-bold">60pt</span> <span class="a-color-price a-text-bold">(7%)</span> </span>

    // series page
    // <span class="a-size-large a-color-price"> ￥632 </span>
    // <span class="a-size-base-plus itemPoints"> 6pt </span>

    // horizontal(author page):
    //<span class="a-size-base a-color-price authorPageCarouselText"> ￥751 </span>
    //<span class="a-size-base a-color-price authorPageCarouselText"> 24pt (3%) </span>

    // author page
    // <span class="a-size-base-plus a-color-price a-text-bold"> ￥751</span>
    // <div class="a-section a-spacing-none"> <span class="a-size-base a-color-secondary"> ポイント: </span> <span class="a-size-base a-color-price a-text-bold"> 24pt </span> <span class="a-size-base a-color-price"> (3%) </span> </div>

    // grid12:
    // <span class="a-price" data-a-size="m" data-a-color="price"><span class="a-offscreen">￥ 413</span><span aria-hidden="true"><span class="a-price-symbol"></span><span class="a-price-whole">￥ 413</span></span></span>
    // <span class="a-size-base-plus asin-loyalty-points-percentage">4ポイント(1%)</span>

    // horizontal(octopus):
    // <div class="a-section octopus-pc-asin-price"><span class="a-price" data-a-size="l" data-a-color="base"><span class="a-offscreen">￥673</span><span aria-hidden="true"><span class="a-price-symbol">￥</span><span class="a-price-whole">673</span></span></span></div><span class="a-price" data-a-size="l" data-a-color="base"><span class="a-offscreen">￥704</span><span aria-hidden="true"><span class="a-price-symbol">￥</span><span class="a-price-whole">704</span></span></span></div>
    // <div class="a-section octopus-pc-asin-points"><span class="a-size-base a-color-base">7ポイント(1%)</span></div>

    // octopus search:
    // <span class="a-price" data-a-size="l" data-a-color="price"><span class="a-offscreen">￥733</span><span aria-hidden="true"><span class="a-price-symbol">￥</span><span class="a-price-whole">733</span></span></span>
    // <span class="a-size-base a-color-price">7ポイント(1%)</span>

    // search: ku が0円になっているので注意
    // <span class="a-price" data-a-size="l" data-a-color="price"><span class="a-offscreen">￥1,188</span><span aria-hidden="true"><span class="a-price-symbol">￥</span><span class="a-price-whole">1,188</span></span></span>
    // <span class="a-size-base a-color-price">12ポイント(1%)</span>
    // search の ku の確認には
    // <i class="a-icon a-icon-kindle-unlimited a-icon-small" role="img" aria-label="Kindle Unlimited."></i>
    // と ￥0。 ku のときは無視で良いかも。ポイントも取れないし。

    // manga-store ranking:
    // <div class="_manga-genre-ranking-card_retail-item-style_price-and-points__AuhbP"><div class="_manga-genre-ranking-card_retail-item-style_price__1dXsv"><span class="a-size-base">￥730</span></div><div class="_manga-genre-ranking-card_retail-item-style_points__gyGlv"><span class="a-size-base"> 57pt (8%) </span></div></div>

    // horizontal(manga-store):
    // <div class="_manga-store-shoveler_style_price-and-points-container__1GAeM"><span class="a-size-small _manga-store-shoveler_style_price__2BiWS"> ￥340 </span><span class="a-size-small _manga-store-shoveler_style_points__3-ajg"> 4pt (1%) </span></div>
}
async function access_api(url) {
    console.log(url);
    let res = {};
    try {
	res = await fetch(url).then(r => r.json())
    } catch (error) {
	console.error(error)
    }
    return res;
}


//// UI functions

// put a price graph button
function put_price_graph_button(e, asin, title, pinfo={}) {
    if (! title) return false;
    const pgd = build_price_graph_dialog(asin, title, pinfo);
    e.style.position = "relative";
    e.appendChild(pgd);
    return true;
}

// 実質割引率バッジ
// build and put a "real discount rate" budge
function show_jsdr_badge(e, jsdr, xp, yp) {
    const class_name = 'kiseppe-jsdr-badge';
    if (! e.querySelector(`.${class_name}`)) {
        const b = document.createElement('div');
        b.classList.add(class_name);
        b.style.top = yp;
        b.style.right = xp;
        b.innerHTML = `実質<br><b>${jsdr}%</b></br>オフ`;
        e.style.position = "relative";
        e.appendChild(b);
        return true;
    } else {
        return false;
    }
}

// "シリーズにセール作品があるよ" バッジ
// build and put a "this series has discounted items" budge
function show_series_sale_badge(e) {
    const class_name = 'kiseppe-series-sale-badge';
    if (! e.querySelector(`.${class_name}`)) {
        const b = document.createElement('span');
        b.classList.add(class_name);
        b.title = 'シリーズにセール作品あり';
        b.innerHTML = '🉐';
        e.appendChild(b);
        return true;
    } else {
        return false;
    }
}

//
// build a price graph <dialog> and a button to display the <dialog>
// (generates a dialog to display a Price Graph iframe)
//
function build_price_graph_dialog(asin, title, pinfo={}) {

    let pr = (typeof pinfo['price']) === 'undefined' ?  '' : pinfo['price'];
    let po = (typeof pinfo['point']) === 'undefined' ?  '' : pinfo['point'];

    // button to display a price graph <dialog>
    const pgb = document.createElement('span');
    pgb.classList.add("kiseppe-pg-btn");
    pgb.title = `価格推移グラフを表示します[${pr}][${po}]`;
    pgb.innerText = '📊';
    
    // click => display a price graph <dialog>
    pgb.addEventListener('click', (event) => {
//    pgb.addEventListener('mouseover', (event) => {
        // build API url (returns a graph content for iframe)
        //const url = KS_IF_API + asin + '--';
        const url = `${KS_IF_API}${asin}-${pr}-${po}`;
        console.log(url);

        // if no <dialog>, then build it
        let pp = document.getElementById("popup_modal");
        if (! pp) {
            pp = document.createElement('dialog');
            pp.id = "popup_modal";
            pp.addEventListener('click', e => 
                e.target.closest('#pg_container') || pp.close());
            document.querySelector("noscript").before(pp);
        }

        // insert a graph content wrapper to <dialog>
        pp.innerHTML = `
<div id="pg_container">
  <div class="pg_item_info">
    <div class="pg_item_title">${title}</div>
    <iframe src="${url}" scrolling="no"></iframe>
  </div>
  <button onclick="document.getElementById('popup_modal').close()">Close</button>
</div>
`;
        document.getElementById("popup_modal").showModal();

        event.stopPropagation();
    });

    return pgb;
}


//
// Insert a Price Graph iframe in an ASIN page (kiseppe 1.0's main())
//
function asin_page_main() {

    if (document.getElementById('kiseppe')) return;

    //// get hight of iframe (use it later)
    window.addEventListener('message', function(e) {
        var iframe = document.getElementById("kiseppe");
        switch(e.data[0]) { // event name
        case 'setHeight':
            iframe.style.height = e.data[1] + "px";
            break;
        }
    }, false);

    //// check if valid, get ASIN code
    // Is thie page for Kindle?
    if (! document.getElementById('nav-search-label-id')) return;
    if (! document.getElementById('nav-search-label-id').textContent.match(/Kindle/m)) return;
    // Does this page have ASIN code?
    if (! document.getElementById('ASIN')) return;
    const asin = document.getElementById('ASIN').value;
    if (! /^B[0-9A-Z]{9}$/.test(asin)) return;
    console.log(`kiseppe: ${asin}`);

    //// get the price from this page
    let _pr = document.getElementById('youPaySection');
    let price = _pr ? _pr.getAttribute('data-kindle-price').replace(/\.0$/, '') : '';
    // case: "期間限定無料(Free for a limited time)" or "kindle unlimited"
    if (price == '') {
        _pr = document.getElementById('kindle-price');
        if (_pr) price = _pr.textContent.match(/([0-9,]+)/m)[1].replace(/,/g, '');
    }

    //// get the point back from this page
    let _po = Array.from(document.getElementsByClassName('total-points-value-display-column')).map(x => x.textContent).join('').match(/\+([0-9,]+) /m);
    let point = _po ? _po[1] : '';
    // case: "期間限定無料(Free for a limited time)" or "kindle unlimited"
    if (point == '') {
        _po = document.getElementById('Ebooks-desktop-KINDLE_ALC-prices-loyaltyPoints');
        if (_po) point = _po.textContent.match(/ ([0-9,]+)/m)[1].replace(/,/g, '');
    }

    //// build API url (returns a web page for iframe)
    // To put the today's point on the graph, API needs price and point.
    const url = `${KS_IF_API}${asin}-${price}-${point}`;
    console.log(url);

    //// display a price graph

    // build iframe
    let new_elm = document.createElement('div');
    new_elm.innerHTML = `<iframe src="${url}" scrolling="no" id="kiseppe"></iframe>`;

    // insert iframe
    let base_elm = document.getElementById('ATFCriticalFeaturesDataContainer');
    base_elm.after(new_elm);
};
