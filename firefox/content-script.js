// Kiseppe's target pages
//
// Pages:
// - Kindle ASIN Page
//   - insert:[price-graph-iframe][item-jsdr][series-jsdr]
//   - observe
//   - wait
// - Kindle Series Page
//   - insert:[price-graph-button][item-jsdr][series-jsdr]
//   - observe
// - Kindle Search Page
//   - insert:[price-graph-button][item-jsdr][series-jsdr]
//   - observe
//   - wait
// - Kindle Author Page
//   - Kindle Author Component
//   - Kindle Carousel Component
//     - observe
// - Kindle Ranking Page
//   - insert:[price-graph-button][item-jsdr]
//   - observe
// - Kindle Grid30 Page
//   - insert:[price-graph-button][item-jsdr]
// - Kindle Octopus Page
//   - Kindle Carousel Component
//   - Kindle Octopus Component
// - Kindle Grid12 Page
//   - Kindle Carousel Component
//   - Kindle Grid12 Component
//     - observe
// - Kindle Store Front Page
//   - Kindle shadowRoot Carousel Component
//     - observe
// - Kindle Manga Store Page
//   - Kindle Carousel Component
//     - observe
// - Kindle Page (others)
//   - Kindle Carousel Component
// - Kindle Page (特別設定なし)
//   - multiby https://www.amazon.co.jp/kindle-dbs/multibuy?basketId=Gz2UUPLE
//   - stores page https://www.amazon.co.jp/stores/page/EF53E35F-2FAF-49AC-B191-257E764F2703
// - Wishlist Page
//   - insert:[price-graph-iframe][item-jsdr]
//   - observe
//   - wait
//
// Components:
// - Kindle Author Component
//   - [price-graph-button][item-jsdr]
// - Kindle Octopus Component
//   - [price-graph-button][item-jsdr][series-jsdr]
// - Kindle Grid12 Component
//   - [price-graph-button][item-jsdr]
// - Kindle Carousel Component
//   - General Carousel
//     - [price-graph-button]
//   - Manga Store Ranking Carousel
//     - [price-graph-button]
// - Kindle shadowRoot Carousel Component
//   - Kindle Store Front Page
//     - [price-graph-button]
//
// Words
// - KS means Kiseppe or Kinseli
// - JSDR means real discount rate (実質割引率)

const KS_IF_API = 'https://www.listasin.net/api/0200/chex/'; // iframe
let KS_JD_API = 'https://www.listasin.net/api/0200_jd.cgi?asins='; // json
const DEBUG_API = 'https://www.listasin.net/api/debug-logging.cgi?asins=';
let JSDR_CUTOFF = 15;
let PROCESS_ON_CAROUSEL = false;
let storage_items = {};

let console_groupCollapsed = () => {};
let console_groupEnd = () => {};
let console_log = () => {};
let console_count = () => {};


////////////////////////////////////////////////////////////////
// Determine page type and assign processing
// ページの種類を判定して処理を割り当てる
// Use an observer for pages with dynamically changing content
// 動的に内容が変化するページには observer を使う
async function main() {

    //// スマホ表示なのかの判定
    const sma = document.querySelector('html').classList.contains('a-touch');
    if (sma) console.log('Kiseppe: smart phone view');

    //// Kindle 関連ページじゃないときは何もせずに終わる
    let ok_flag = 0;
    let is_asin_page = 0;
    let is_wishlist_page = 0;

    // Kindle 関連ページの判定方法: 上のメニューバーの一番左に "Kindle" が含まれる
    // PC page: #nav-subnav a[aria-label]
    // SP page(manga): #manga-mobile-subnav a[aria-label]
    //chk += document.querySelector('#nav-subnav .nav-a-content')?.textContent;
    let chk = document.querySelector('#nav-subnav a[aria-label]')?.textContent;
    //chk += document.querySelector('#manga-mobile-subnav a[aria-label]')?.textContent;
    //if (/Kindle|Fliptoon/.test(chk)) ok_flag = 1;

    if (document.querySelector('#tmm-grid-swatch-KINDLE,#tmm-grid-swatch-OTHER')?.classList.contains('selected')) {
        // ASIN page 判定 (PC/SP 共通)
        ok_flag = 1;
        is_asin_page = 1;
        console.log('judged: PC/SP ASIN page');
    } else if (/ほしい物リスト/.test(
        document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    )) {
        // ほしい物リストページの判定 (PC/SP 共通)
        // <meta property="og:title" content="Amazonほしい物リストを一緒に編集しましょう">
        //chk = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        //if (/ほしい物リスト/.test(chk)) {
        ok_flag = 1;
        is_wishlist_page = 1;
        console.log('judged: PC/SP wishlist');
        //}
    } else if (/Kindle|Fliptoon/.test(chk)) {
        console.log('judged: a page in kindle store');
    } else {
        return;
    }
    //if (!ok_flag) return;

    // options
    storage_items = await new Promise(r => chrome.storage.local.get(null, r)).
        catch(error => console.error(error));
    if (storage_items?.opt_use_debug_api == true)
        KS_JD_API = DEBUG_API;
    if (storage_items?.opt_jsdr_cutoff)
        JSDR_CUTOFF = Number(storage_items.opt_jsdr_cutoff);
    if (storage_items?.opt_process_on_carousel)
        PROCESS_ON_CAROUSEL = true;
    const isDebugMode = storage_items?.opt_activate_console_log ?? false;
    if (isDebugMode) {
        console_groupCollapsed = (...s) => console.groupCollapsed(...s);
        console_groupEnd = (...s) => console.groupEnd(...s);
        console_log = (...s) => console.log(...s);
        console_count = (...s) => console.count(...s);
    }

    console_log("Kiseppe: start processing on Kindle related page")
    console_log("options", storage_items)

    // callback function for observer
    const config = { childList: true, subtree: true };
    const generate_callback = (e, f) => async function (mutations, observer) {
        let shouldRun = false;
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                shouldRun = true;
                break;
            }
        }
        if (!shouldRun) return;
        
        observer.disconnect();
        console_log('stop observation and do something');
        try {
            await f();
        } catch (error) {
            console.error('Error:', error);
        }
        console_log('restart observation');
        observer.observe(e, config);
    };
    const generate_callback_ex = (e, qs, f) => async function (mutations, observer) {
        const exs = new Set([...e.querySelectorAll(qs)]);
        let is_mutation_detected = mutations.some(mu => !exs.has(mu.target));
        if (!is_mutation_detected) return;
        const f2 = generate_callback(e, f);
        f2(mutations, observer);
    };

    if (is_wishlist_page) {

        if (!storage_items?.opt_process_on_wishlist) return;

        await wishlist_page();

        const e = document.querySelector('div#wl-item-view, ul#awl-list-items');
        // PC page: ul#g-items=>div#... / SP page: ul#awl-list-items
        console.assert(e);
        if (!e) return;
        const callback = generate_callback(e, wishlist_page);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } // case: /Kindle/.test(chk) === true
    //else if (document.getElementById('ASIN')) {
    else if (is_asin_page) {

        console_log("kiseppe: here is Kindle ASIN Page");
        kindle_asin_page();
        if (storage_items?.opt_asin_page_only) return;
        if (!PROCESS_ON_CAROUSEL) return;

        await kindle_carousel_component();
        console_log("wait a few seconds");
        await sleep(1500);
        console_log("ok, go!");
        
        // - ignore carousel components without kindle books
        //   - observe only [id=dp-container]
        const e = document.getElementById('dp-container');
        console.assert(e, "Element with id=dp-container not found");
        // - ignore countdown timer
        //   - [id*="Timer"] : 期間限定キャンペーン(right price box)
        //   - [data-endtimeseconds], [class*="timer"] : 特別オファー
        const callback = generate_callback_ex(
            e,
            '[id*="Timer"], [class*="timer"]',
            kindle_carousel_component
        );
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (storage_items?.opt_asin_page_only) {

        // 当該オプション指定されていれば ASIN ページ以外の処理は行わない
        return;

    } else if (document.querySelector(
        'div[id="browse-views-area"] div[class*="browse-clickable-item"]'
    )) {

        console_log("kiseppe: here is Kindle Grid30 Page");
        kindle_grid30_page();

    } else if (document.querySelector(
        '[data-card-metrics-id*="octopus-search-result-card_"'
    )) {

        console_log("kiseppe: here is Kindle Octpus Page");
        kindle_octopus_component();
        if (!PROCESS_ON_CAROUSEL) return;
        kindle_carousel_component();

    //} else if (document.querySelector('title') &&
    //           /一覧.+著者/.test(document.querySelector('title').textContent)) {
    } else if (/\/author\//.test(location.href)) {

        console_log("kiseppe: here is Kindle Author Page");
        kindle_author_component();
        if (!PROCESS_ON_CAROUSEL) return;
        await kindle_carousel_component();

        //const e = document.querySelector('#authorPageBooks');
        const e = document.querySelector('[data-card-metrics-id^=smart-catalog-card_author');
        if (!e) return;
        console.assert(e);
        const callback = generate_callback(e, kindle_carousel_component);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector('div[class*="result-section"]') &&
               document.querySelector('div[id=search-results]')) {

        console_log("kiseppe: here is Grid12 Page");
        await kindle_grid12_component();

        const e = document.querySelector('div[id=search-results]').parentNode;
        console.assert(e);
        const callback = generate_callback(e, kindle_grid12_component);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

        if (!PROCESS_ON_CAROUSEL) return;
        kindle_carousel_component();

    } else if (document.querySelector(
        '[data-entity-id][data-type=collection], [data-collection-asin]'
    )) {

        console_log("kiseppe: here is Kindle Series Page");
        await kindle_series_page();

        const e = document.querySelector('div[id=series-childAsin-widget]');
        // シリーズASINはあるが作品はない場合 ex. B09YL554L6
        if (!e) return;

        const callback =
              generate_callback_ex(e, '#countdown_timer', kindle_series_page);
        // #countdown_timer : 終了までXXXXX秒
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector('div#nav-subnav[data-category="digital-text"]') &&
               document.querySelector('div#search')) {

        console_log("kiseppe: here is Kindle Search Page");
        await kindle_search_page();
        
        const e = document.querySelector('div#search');
        console.assert(e);
        const callback = generate_callback(e, kindle_search_page);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (/(new-releases|bestsellers|movers-and-shakers)\/digital-text/.test(location.href)) {

        console_log("kiseppe: here is Kindle Ranking Page");
        await kindle_ranking_page();

        const e = document.querySelector('div.p13n-desktop-grid');
        console.assert(e);
        const callback = generate_callback(e, kindle_ranking_page);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (/kindle-dbs\/storefront/.test(location.href)) {

        console_log("kiseppe: here is Kindle Store Front Page");

        if (!PROCESS_ON_CAROUSEL) return;
        await kindle_shadowroot_carousel_component();

        const e = document.querySelector('html');
        console.assert(e);
        const callback = generate_callback(e, kindle_shadowroot_carousel_component);
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (/manga-store/.test(location.href)) {

        console_log("kiseppe: here is Kindle Manga Store Page");

        if (!PROCESS_ON_CAROUSEL) return;
        await kindle_carousel_component();

        const e = document.querySelector('.msw-page');
        console.assert(e);
        const callback = generate_callback_ex(
            e,
            'div[data-csa-c-painter="banner-carousel-cards"]',
            kindle_carousel_component
        );
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector(
        '#nav-subnav[data-category=digital-text]'
    )) {

        console_log("kiseppe: here is Kindle Store Page (Others)");

        if (!PROCESS_ON_CAROUSEL) return;
        kindle_carousel_component();

    } else {

    }
}


////////////////////////////////////////////////////////////////
// functions to process page or component (part of HTML page)
// ページやコンポーネント（ページ内の一部分）ごとの処理を行う関数たち
//
// 1. parse HTML
//   - get ASINs, title, series ASIN
//   - put graph button
// 2. API access
//   - access Kiseppe's Web API
//   - get result (JSON)
// 3. display jsdr information
//   - put jsdr badge, change background color

//// Kindle ASIN page
// Ex. https://www.amazon.co.jp/dp/B0C5QMW1JY
async function kindle_asin_page() {
    //const asin = document.getElementById('ASIN').value; // PC page only
    const asin = (document.URL.match(/B[0-9A-Z]{9}/) || [])[0] ?? ''; // Common
    if (!/^B[0-9A-Z]{9}$/.test(asin)) return;
    
    //// get the price and the point back from this page
    //const pinfo = extract_price_and_point(document.querySelector('#MediaMatrix'));
    const pinfo = extract_price_and_point(
        //document.querySelector('#mediamatrix_feature_div')
        document.querySelector('#mediamatrix_feature_div .selected')
    );
    
    // call kiseppe 1.0 (kiseppe1.0::main() => insert_price_graph())
    insert_price_graph(asin, pinfo);
    if (storage_items?.opt_asin_page_only) return;

    // put price graph button (since 2023/12)
    const te = document.querySelector('h1#title'); // PC page
    const btn = build_price_graph_dialog(asin, te?.textContent, pinfo);
    if (te && btn) {
        btn.style.position = 'relative';
        btn.style.fontSize = '1rem';
        te.appendChild(btn);
    }

    // get series ASIN
    const [srasin, c] = get_series_asin(document.body);

    // API access
    const res = await access_api_params((srasin ? `COL_${srasin},` : '') + asin);
    if (!res?.result) return;

    // display jsdr information
    if (srasin) {
        const sr_jsdr = get_series_jsdr(srasin, res);
        if (sr_jsdr >= JSDR_CUTOFF) show_series_sale_badge(c);
    }
    const jsdr = get_jsdr(asin, res, {asin: pinfo});
    if (jsdr < JSDR_CUTOFF) return;
    const x = document.querySelector('#leftCol'); // '#imageBlock'
    change_background_color(x, jsdr, 'g');
    const x2 = x.querySelector('div#imageBlock .a-fixed-left-grid');
    show_jsdr_badge(x2, jsdr, "0", "0");

    return;
}

//// Wishlist Page
// Ex. https://www.amazon.co.jp/hz/wishlist/ls/
async function wishlist_page() {

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const asins = [];
    // PC page (list): ul#g-items > li
    // PC page (grid): ul#g-items-grid > li
    // SP page: ul#awl-list-items > li
    const elems = [...document.querySelectorAll('ul#g-items > li, ul#g-items-grid > li, ul#awl-list-items > li')];
    elems.forEach(cntn => {
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        if (!/Kindle版/.test(cntn.textContent) &&
            !/1-Clickで今すぐ買う/.test(cntn.textContent)) return;

        let asin = '';
        let item_title = '';
        const di = cntn.querySelector('div[data-csa-c-item-id]');
        if (di) { // list
            asin = di.dataset.csaCItemId;
            if (!asin.startsWith("B")) return;
            item_title = cntn.querySelector('img[height]')?.getAttribute('alt');
            a2pinfo[asin] = extract_price_and_point(cntn);
            put_price_graph_button(cntn, asin, item_title, a2pinfo[asin]);
        } else { // grid
            const firstLink = cntn.querySelector('a');
            if (!firstLink) return;
            const regex = /\/dp\/(B[0-9A-Z]{9})\//;
            const match = firstLink.href.match(regex);
            if (!match) return;
            asin = match[1];
            item_title = firstLink.title;
            a2pinfo[asin] = extract_price_and_point(cntn);
            const c = cntn.querySelector('.wl-grid-item-selectable')
            put_price_graph_button(c, asin, item_title, a2pinfo[asin]);
        }
        asins.push(asin);
        cntn.dataset.ks_asin = asin;
    });
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);
    
    // API access
    const res = await access_api_params(asins_pp.join(","));

    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        const cntn = document.querySelector(`li[data-ks_asin=${asin}]`);
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        let ca = cntn.querySelector('[id^=itemImage]');
        if (ca) { // list
            show_jsdr_badge(ca, jsdr, "0", "0");
            change_background_color(cntn, jsdr);
        } else { // grid
            ca = cntn.querySelector('.wl-grid-item-middle-section');
            if (!ca) return;
            show_jsdr_badge(ca, jsdr, "1", "0");
            change_background_color(ca, jsdr);
        }
    });

    return;
}

//// Kindle Author Component
// Ex. https://www.amazon.co.jp/kindle-dbs/entity/author/B004L41ULY
// => https://www.amazon.co.jp/stores/.../author/B004L41ULY
async function kindle_author_component() {

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const asins = [];
    // li[data-csa-c-item-type=asin] : グリッド表示
    // div[data-csa-c-item-type=asin] : 大カードリスト表示
    const elems = [...document.querySelectorAll('[data-csa-c-item-type=asin]')];
    elems.forEach(cntn => {
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        const c = cntn.querySelector('a[href*="dp/B"]');
        if (!c) return; // not Kindle book
        const asin = get_asin_in_href(c);
        asins.push(asin);
        cntn.dataset.ks_asin = asin;
        const item_title = c.getAttribute('aria-label') || c.getAttribute('title');
        a2pinfo[asin] = extract_price_and_point(cntn);
        put_price_graph_button(cntn, asin, item_title, a2pinfo[asin]);
    });
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);
    
    // API access
    const res = await access_api_params(asins_pp.join(","));

    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        const cntn = document.querySelector(`[data-ks_asin=${asin}]`);
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        //const ca = cntn.querySelector('a[aria-label]');
        show_jsdr_badge(cntn, jsdr, "0", "0");
        change_background_color(cntn, jsdr);
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
    const asins = [];
    const elems = [...document.querySelectorAll(qs_grid30)];
    elems.forEach(e => {
        const le = e.querySelector('a[href^="/gp/product/B"][aria-label]');
        const asin = get_asin_in_href(le);
        if (!asin) return;
        asins.push(asin);
        const item_title = le.getAttribute('aria-label');
        a2pinfo[asin] = extract_price_and_point(e);
        put_price_graph_button(e, asin, item_title, a2pinfo[asin]);
    });
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);
    
    // API access
    const res = await access_api_params(asins_pp.join(","));

    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        const e = document.querySelector(
            `${qs_grid30} a[href^="/gp/product/${asin}"][aria-label]`
        );
        const cntn = e.closest('div[class*="browse-clickable-item"]');
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        show_jsdr_badge(cntn, jsdr, "0", "0");
        change_background_color(cntn, jsdr, 'g');
    });
    
    return;
}

//// Kindle Octopus Component
// 特設ページなどの下の方に12個固定で表示されるやつ
// Ex. https://www.amazon.co.jp/b?node=22083216051
async function kindle_octopus_component() {
    let e = document.querySelector('[data-card-metrics-id*="octopus-search-result-card_"');

    // get all ASINs
    const a2pinfo = {};
    const aslist = [];
    const calist = [];
    const elems = [...e.querySelectorAll("a[href] > h2")];
    elems.forEach(e => {
        const asin = get_asin_in_href(e.parentNode);
        if (!asin) return;
        const cntn = e.closest('div[class*="s-card-container"]');
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        const [srasin, seri] = get_series_asin(cntn);
        if (srasin) calist.push(...['COL_' + srasin, asin]);
        else aslist.push(asin);
        a2pinfo[asin] = extract_price_and_point(cntn);
        put_price_graph_button(cntn, asin, e.textContent, a2pinfo[asin]);
    });
    const asins = [aslist, calist].flat();
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);

    // API access
    const res = await access_api_params(asins_pp.join(","));
    
    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        const e = document.querySelector(`a[href*="/dp/${asin}"] > h2`);
        if (!e) return;
        //console_log('kiseppe: octopus-component', asin);
        const cntn = e.closest('div[class*="s-card-container"]');
        const [srasin, seri] = get_series_asin(cntn);
        const sr_jsdr = get_series_jsdr(srasin, res);
        if (sr_jsdr >= JSDR_CUTOFF) show_series_sale_badge(seri);
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        show_jsdr_badge(cntn, jsdr, "0", "0");
        change_background_color(cntn, jsdr);
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
    const asins = [];
    const elems = [...document.querySelectorAll('div[class*="asin-container"] a[href]')];
    elems.forEach(e => {
        const asin = get_asin_in_href(e);
        if (!asin) return;
        asins.push(asin);
        const c = e.closest('div[class*="asin-container"]');
        if (c.querySelector('.kiseppe-pg-btn')) return;
        const item_title = e.querySelector('img[alt]').getAttribute('alt');
        a2pinfo[asin] = extract_price_and_point(c);
        put_price_graph_button(c, asin, item_title, a2pinfo[asin]);
    });
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);

    // API access
    const res = await access_api_params(asins_pp.join(","));

    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        if ((e = document.querySelector(
            `div[class*="asin-container"] a[href*="/dp/${asin}"]`
        )) !== null) {
            const c = e.closest('div[class*="asin-container"]');
            const jsdr = get_jsdr(asin, res, a2pinfo);
            if (jsdr < JSDR_CUTOFF) return;
            show_jsdr_badge(c, jsdr, "0", "0");
            change_background_color(c, jsdr, 'g');
        }
    });

    return;
}

//// Kindle Series Page
// ("collection" means "series")
async function kindle_series_page() {

    // get series ASIN
    let e = document.querySelector('[data-entity-id][data-type=collection]');
    let srasin = e?.dataset?.entityId;
    if (!srasin) {
        e = document.querySelector('[data-collection-asin*="B"]');
        srasin = e?.dataset?.collectionAsin;
    }
    if (!srasin) return;
    //console_log('series asin:', srasin);

    // get ASINs
    const a2pinfo = {};
    const aset = new Set();
    // Ex. data-ajax-url="...B074V5W2R7,B074V3V9W5,B074V5W5GT"
    let elems = [...document.querySelectorAll('[data-ajax-url*="B"]')];
    elems.forEach(e => {
        const r = e.getAttribute('data-ajax-url').match(/(B[0-9A-Z]{9})/g);
        r.forEach(s => aset.add(s));
    });
    // all items (in this series) displayed on this page
    elems = [...document.querySelectorAll('div[id^="series-childAsin-item_"]')];
    elems.forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;
        const co = e.querySelector(`a[class*="itemImageLink"][role="img"]`);
        const asin = get_asin_in_href(co);
        if (!asin) return;
        aset.add(asin);
        const item_title = co.getAttribute('title');
        a2pinfo[asin] = extract_price_and_point(e);
        put_price_graph_button(e, asin, item_title, a2pinfo[asin]);
    });
    const asins = Array.from(aset);
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);

    // API access
    const res = await access_api_params(`COL_${srasin},` + asins_pp.join(","));

    // display jsdr information
    const sr_jsdr = get_series_jsdr(srasin, res);
    if (sr_jsdr >= JSDR_CUTOFF) {
        const c = document.getElementById('collection-masthead__title') ??
              document.getElementById('collection-title');
        if (c) show_series_sale_badge(c.parentNode);
    }
    Object.keys(res?.result?.books || []).forEach(asin => {
        const co = document.querySelector(`a[href*="${asin}"][role="img"]`);
        if (!co) return;
        const cntn = co.closest('div[id^="series-childAsin-item_"]');
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        show_jsdr_badge(co, jsdr, "0", "-4px");
        change_background_color(cntn, jsdr);
    });

    return;
}

//// Kindle Ranking Page
// Ex. https://www.amazon.co.jp/gp/new-releases/digital-text/
// Ex. https://www.amazon.co.jp/gp/bestsellers/digital-text/
// Ex. https://www.amazon.co.jp/gp/movers-and-shakers/digital-text/
async function kindle_ranking_page() {

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const asins = [];
    const elems = [...document.querySelectorAll('div[id^="p13n-asin-index-"]')];
    elems.forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;
        const co = e.querySelector('div[class^="p13n-sc-un"]');
        const asin = co.id;
        const item_title = co.querySelector('img').getAttribute('alt');
        asins.push(asin);
        a2pinfo[asin] = extract_price_and_point(e);
        put_price_graph_button(e, asin, item_title, a2pinfo[asin]);
    });
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);

    // API access
    const res = await access_api_params(asins_pp.join(","));

    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        const co = document.querySelector(`div[id="${asin}"]`);
        const cntn = co.closest('div[data-a-card-type]');
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        show_jsdr_badge(co, jsdr, "0", "0");
        change_background_color(cntn, jsdr);
    });

    return;
}

//// Kindle Search Page
// Ex. https://www.amazon.co.jp/s?rh=n%3A2410280051&fs=true
async function kindle_search_page() {

    console_log("wait a few seconds");
    await sleep(1600);
    console_log("ok, go!");

    // collect ASINs for API access and put price graph buttons
    const a2pinfo = {};
    const aslist = [];
    const calist = [];
    const elems = [...document.querySelectorAll(
        'div[data-asin][data-component-type="s-search-result"]'
    )];
    //document.querySelectorAll(
    //    'div[data-asin][data-component-type="s-search-result"]'
    //).forEach(e => {
    elems.forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;
        const asin = e.dataset.asin;
        if (!asin) return;

        const [srasin, seri] = get_series_asin(e);
        if (srasin) calist.push(...['COL_' + srasin, asin]);
        else aslist.push(asin);

        const item_title = e.querySelector('h2').textContent;
        const c = e.querySelector('div[cel_widget_id]');
        a2pinfo[asin] = extract_price_and_point(e);
        put_price_graph_button(c, asin, item_title, a2pinfo[asin]);
    });
    const asins = [aslist, calist].flat();
    if (asins.length <= 0) return;
    const asins_pp = add_priceinfo_to_asinlist(asins, a2pinfo);

    // API access
    const res = await access_api_params(asins_pp.join(","));

    // display jsdr information
    Object.keys(res?.result?.books || []).forEach(asin => {
        const cntn = document.querySelector(`div[data-asin="${asin}"]`);
        const [srasin, seri] = get_series_asin(cntn);
        const sr_jsdr = get_series_jsdr(srasin, res);
        if (sr_jsdr >= JSDR_CUTOFF) show_series_sale_badge(seri);
        const jsdr = get_jsdr(asin, res, a2pinfo);
        if (jsdr < JSDR_CUTOFF) return;
        let x = cntn.querySelector('img').closest('.puisg-col-inner');
        if (!x) x = cntn.querySelector('img').closest('.sg-col-inner');
        show_jsdr_badge(x, jsdr, "4px", "0");
        const c = cntn.querySelector('div[cel_widget_id]');
        change_background_color(c, jsdr);
        const b = cntn.querySelector('div[class*="-badge-container"]');
        if (b) change_background_color(b, 0);
    });

    return;
}

//// Kindle Carousel Component
async function kindle_carousel_component() {

    const a2pinfo = {};
    const asinss = [];

    //// manga store ranking carousel
    // マンガストアトップ ランキング横スクロール表示
    // Ex. https://www.amazon.co.jp/kindle-dbs/manga-store/
    const qs_rk = 'div[class^="_manga-genre-ranking-card_style_grid-container"]';
    if (document.querySelector(qs_rk)) {
        console_log('kiseppe: > manga-store ranking area');
        const asins = [];
        const ca = document.querySelector(qs_rk);
        const elems = [...ca.querySelectorAll(
            'a[href*="/dp/B"] img[class*="_manga-genre-ranking-card_retail-item-style_book-cover"]'
        )];
        elems.forEach(e => {
            const cntn = e.closest('div[id^="grid-item_"]');
            if (cntn.querySelector('.kiseppe-pg-btn'))
                return; // button already exists
            if (cntn.querySelector('img[alt="likes icon"]'))
                return; // manga-store mateba-muryou's "likes" icon
            const asin = get_asin_in_href(e.closest('a'));
            const item_title = e.getAttribute('alt')
            const pinfo = extract_price_and_point(cntn);
            a2pinfo[asin] = pinfo;
            asins.push(asin);
            cntn.dataset.ks_asin = asin;
            put_price_graph_button(cntn, asin, item_title, pinfo);
        });
        if (asins.length > 0) asinss.push(asins);
    }

    //// general carousel
    // カテゴリTOP: div[class*="octopus-pc-card-content"]
    // ASIN page: %2Fdp%2FB00JGI56B0%2F
    // 横並びだけどスクロールしないやつ
    // Ex. https://www.amazon.co.jp/b?node=2292699051
    const qs_carousel =
          'div[class*="a-carousel-row-inner"], ' +
          'div[class*="octopus-pc-card-content"]';
    const elems1 = [...document.querySelectorAll(qs_carousel)];
    elems1.forEach(ca => {
        if (ca.querySelector('img[alt="likes icon"]'))
            return; // manga-store mateba-muryou's "likes" icon
        if (ca.querySelector('span[class*="collection-type"]'))
            return; // manga-store collection ASIN
        if (ca.querySelector('[class*="a-icon-prime"]'))
            return; // ASIN page non-kindle-books
        console_log('kiseppe: > general carousel');
        const asins = [];
        const elems2 = [...ca.querySelectorAll(
            'li a[href*="/dp/B"] img[alt], ' +
                'li a[href^="/gp/product/B"] img[alt], ' + 
                'li a[href*="%2Fdp%2FB"] img[alt]'
        )];
        elems2.forEach(e => {
            if (/image-ku/.test(e.getAttribute('src'))) return;
            let cntn = e.closest('div[class^="_manga-store-shoveler_style_item-row-"]'); // two rows
            if (!cntn) cntn = e.closest('li');
            if (cntn.querySelector('.kiseppe-pg-btn'))
                return; // button already exists
            if (/banner-/.test(cntn.getAttribute("class")))
                return; // manga-store big banner            
            if (cntn.querySelector('[data-endtime]'))
                return; // with timer

            const asin = get_asin_in_href(e.closest('a'));
            const item_title = e.getAttribute('alt')
            const pinfo = extract_price_and_point(cntn);
            a2pinfo[asin] = pinfo;
            asins.push(asin);
            cntn.dataset.ks_asin = asin;
            put_price_graph_button(cntn, asin, item_title, pinfo);
        });
        if (asins.length > 0) asinss.push(asins);
    });

    for (const i in asinss) {
        const asins = asinss[i];

        // API access
        const res = await access_api_params(asins.join(","));
        // display jsdr information
        Object.keys(res?.result?.books || []).forEach(asin => {
            const jsdr = get_jsdr(asin, res, a2pinfo);
            if (jsdr < JSDR_CUTOFF) return;
            const elems = [...document.querySelectorAll(`[data-ks_asin="${asin}"]`)];
            elems.forEach(cntn => {
                let c = cntn.querySelector('.octopus-pc-asin-info-section');
                if (c) {
                    show_jsdr_badge(cntn, jsdr, "2px", "0");
                    change_background_color(c, jsdr);
                    return;
                }
                show_jsdr_badge(cntn, jsdr, "0", "0");
                change_background_color(cntn, jsdr, 'g');
            });
        });

        await sleep(700);
    }

    return;
}

//// Kindle shadowRoot Carousel Component
async function kindle_shadowroot_carousel_component() {

    // Kindle Store Front Page
    // Ex. https://www.amazon.co.jp/kindle-dbs/storefront
    if (/kindle-dbs\/storefront/.test(location.href)) {
        console_log('kiseppe: > storefront carousel');
        
        console_log("wait a few seconds");
        await sleep(1000);
        console_log("ok, go!");

        //const qs_cs = 'div[id^="unified-ebooks-storefront-default_"]';
        const qs_cs = 'div.celwidget';
        const a2pinfo = {};
        const asinss = [];
        const elems1 = [...document.querySelectorAll(qs_cs)];
        elems1.forEach(ca => {
            //console.log('ca',ca);
            const e = ca.querySelector('bds-render-context-provider');
            if (!e) return;
            const slot = e.shadowRoot.querySelector('slot');
            const assignedNodes = slot.assignedNodes({flatten: true});
            //console.log('assignedNodes',assignedNodes);
            const asins = [];
            const elems2 = [...assignedNodes[0].querySelectorAll('li')];
            elems2.forEach(li => {
                if (li.querySelector('.kiseppe-pg-btn'))
                    return; // button already exists
                //console.log(li);
                const e2 = li.querySelector('bds-unified-book-faceout');
                if (!e2) return;//{console.log('no e2',li); return;}
                const bi = e2.shadowRoot.querySelector('div.ubf-book-info');
                if (!bi) return;//{console.log('no bi',e2); return;}
                const at = bi.querySelector('a');
                if (!at) return;//{console.log('no at',bi); return;}
                const asin = get_asin_in_href(at);
                const item_title = at.querySelector('bds-book-cover-image').getAttribute('coverimagealttext');
                const pinfo = {'price':undefined, 'point':undefined};
                a2pinfo[asin] = pinfo;
                //console.log(bi, asin, item_title, pinfo);
                asins.push(asin);
                li.dataset.ks_asin = asin;
                
                put_price_graph_button(li, asin, item_title, pinfo);
            });
            if (asins.length > 0) asinss.push(asins);
        });

        for (const i in asinss) {
            const asins = asinss[i];

            // API access
            const res = await access_api_params(asins.join(","));

            // display jsdr information
            Object.keys(res?.result?.books || []).forEach(asin => {
                const jsdr = get_jsdr(asin, res, a2pinfo);
                if (jsdr < JSDR_CUTOFF) return;
                const elems = [...document.querySelectorAll(`[data-ks_asin="${asin}"]`)];
                elems.forEach(cntn => {
                    show_jsdr_badge(cntn, jsdr, "0", "0");
                    change_background_color(cntn, jsdr);
                });
            });

            await sleep(700);
        }

        return;
    }
}


////////////////////////////////////////////////////////////////
//// Miscellaneous Small Functions

const sleep = ms => new Promise(res => setTimeout(res, ms));

const get_asin_in_href = (e) =>
      (e?.getAttribute('href')?.match(/B[0-9A-Z]{9}/) || [])[0] ?? '';

const get_series_asin = (e) => {
    const c = e?.querySelector("a[href*='binding=kindle_edition']");
    const srasin = get_asin_in_href(c);
    return [srasin, c];
}

const get_series_jsdr = (srasin, apires) =>
      Number(apires?.result?.series?.[srasin] ?? '');

function get_jsdr(asin, apires, current) {
    const [api, now] = [apires?.result?.books?.[asin], current?.[asin]]
    if (!api) return 0;
    if (!now || now.price === void 0) return Number(api.jsdr);

    const max_price = Number(api.max_price);
    if (max_price == 0) return 0;

    const calc_jsdr = (pr, po, mx) => {
        let v = Math.ceil((mx - (pr - po)) / mx * 100);
        if (v == 100 & 0 < (pr - po)) v = 99;
        return (0 <= v & v <= 100) ? v : 0;
    };
    if (now.point === void 0) { // case: point not displayed (ex. ku)
        if (Number(now.price) < Number(api.latest_price))
            return calc_jsdr(Number(now.price), 0, max_price);
    } else { // case: point displayed
        if (now.price != api.latest_price || now.point != api.latest_point)
            return calc_jsdr(Number(now.price), Number(now.point), max_price);
    }
    return Number(api.jsdr);
}

function extract_price_and_point(e) {
    console_groupCollapsed('extract_price_and_point');
    console.assert(e, 'e');
    let price;
    let point;

    try {
        //const elms = [...e.querySelectorAll('.selected')];
        //const html =  (elms.length ? elms : [e]).map(n => n.innerHTML).join(' ');
        //const elm = e.querySelector('.selected');
        //const html =  elm?.innerHTML || '';
        const html =  e?.innerHTML || '';
        const s = html.replace(/(<style>.+?<\/style>|<[^>]+>|\s)+/gs, ' ');
        console_log("ext:", s);

        let r = s.match(/￥\s*\d{1,3}(,\d{3})*/g);
        if (r) {
            r = r.map(m => m.replace(/\D+/g, ''));
            if (
                s.match(/[Uu]nlimited|または/)
                //elm.querySelector('.a-icon-kindle-unlimited')
            ) { // KU のときは 0 円以外の金額(MAX)を選択
                // 0 円しかないときは price は undefined のままに
                const max_price = Math.max(...r);
                if (max_price > 0) price = max_price;
                console_log('KU Yen', price, r);
            } else {
                price = r[0];
                console_log('Yen', price, r);
            }
        }
        
        if (r = s.match(/(\d+)(ポイント|pt)/)) {
            point = r[1];
            console_log('pt', r[0]);
        }
        if (!price && point) point = void 0;

    } catch (error) {
        console.error('Error:', error);
    }

    console_log("price-point", price, point);
    console_groupEnd();
    return {'price': price, 'point': point};

    // ranking:
    // querySelectorAll('.a-color-price') x 2
    // <span class="a-size-base a-color-price"><span class="_cDEzb_p13n-sc-price_3mJ9Z">￥1,584</span></span>
    // <span class="a-size-base a-color-price">16ポイント(1%)</span>

    // carousel(general?):
    // <span class="a-size-base a-color-price">￥ 499</span>
    // <span class="a-size-base a-color-price">5pt</span>
    // <span class="a-size-base a-color-price">(1%)</span>

    // grid30
    // <span class="a-color-price a-text-bold">￥ 814</span>
    // <span class="a-list-item a-size-small"> <span class="a-color-price a-text-bold">60pt</span> <span class="a-color-price a-text-bold">(7%)</span> </span>

    // series page
    // <span class="a-size-large a-color-price"> ￥632 </span>
    // <span class="a-size-base-plus itemPoints"> 6pt </span>

    // carousel(author page):
    //<span class="a-size-base a-color-price authorPageCarouselText"> ￥751 </span>
    //<span class="a-size-base a-color-price authorPageCarouselText"> 24pt (3%) </span>

    // author page
    // <span class="a-size-base-plus a-color-price a-text-bold"> ￥751</span>
    // <div class="a-section a-spacing-none"> <span class="a-size-base a-color-secondary"> ポイント: </span> <span class="a-size-base a-color-price a-text-bold"> 24pt </span> <span class="a-size-base a-color-price"> (3%) </span> </div>

    // grid12:
    // <span class="a-price" data-a-size="m" data-a-color="price"><span class="a-offscreen">￥ 413</span><span aria-hidden="true"><span class="a-price-symbol"></span><span class="a-price-whole">￥ 413</span></span></span>
    // <span class="a-size-base-plus asin-loyalty-points-percentage">4ポイント(1%)</span>

    // carousel(octopus):
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

    // carousel(manga-store):
    // <div class="_manga-store-shoveler_style_price-and-points-container__1GAeM"><span class="a-size-small _manga-store-shoveler_style_price__2BiWS"> ￥340 </span><span class="a-size-small _manga-store-shoveler_style_points__3-ajg"> 4pt (1%) </span></div>
}

async function access_api_params(params) {
    let url = KS_JD_API + params;
    if (storage_items?.opt_user_id) url += `&uid=${storage_items.opt_user_id}`;
    console_log('kiseppe JD API URL: ' + url);
    console_count('api access');
    if (storage_items?.opt_no_api_access) return {};
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Network response was not ok ' + response.statusText);
            return {};
        }
        return await response.json();
    } catch (error) {
        console.error(error, url);
        return { error: true, message: error.message };
    }
}

function add_priceinfo_to_asinlist(asinlist, a2pinfo) {
    if (!asinlist || !a2pinfo) return asinlist;
    return asinlist.map(asin => {
        if (!/^B[0-9A-Z]{9}$/.test(asin)) return asin; // Ex. "COL_B0.."
        if (!a2pinfo[asin]) return asin; // no price info
        const pinfo = a2pinfo[asin];
        const [pr, po] = [pinfo.price ?? '', pinfo.point ?? ''];
        return `${asin},AI_${pr}_${po}`;
    });
}


////////////////////////////////////////////////////////////////
//// UI functions

// put a price graph button
function put_price_graph_button(e, asin, title, pinfo={}) {
    if (!e || !title) return false;
    const pgd = build_price_graph_dialog(asin, title, pinfo);
    if (getComputedStyle(e).position === "static") {
	e.style.position = "relative";
    }
    e.appendChild(pgd);
    return true;
}

// change background color according to jsdr
// 実質割引率に合わせて背景色を変更
function change_background_color(e, v, mode = "") { // 0 <= v <= 100
    if (!e) return false;
    const toumei = v / 100 * 0.2;
    const color_hex =  (storage_items?.opt_bgcolor_hex) || '#FF0000';
    const rgb = hex2rgb(color_hex).join(',');
    const rgba = `rgba(${rgb},${toumei})`;
    if (mode == 'g') e.style.background =
        `linear-gradient(${rgba} 95%, rgba(${rgb},0))`;
    else e.style.backgroundColor = rgba;
    return true;
}
const hex2rgb = (hex) => {
    const i = parseInt(hex.slice(1), 16);
    return [(i >> 16) & 255, (i >> 8) & 255, i & 255]
}

// build and put a "real discount rate" badge
// 実質割引率バッジ
function show_jsdr_badge(e, jsdr, xp, yp) {
    if (!e) return false;
    const class_name = 'kiseppe-jsdr-badge';
    if (e.querySelector(`.${class_name}`)) return false;
    const b = document.createElement('div');
    b.classList.add(class_name);
    b.style.top = yp;
    b.style.right = xp;

    // `実質<br><b>${jsdr}%</b></br>オフ`
    b.appendChild(document.createTextNode('実質'));
    b.appendChild(document.createElement('br'));
    const bj = document.createElement('b');
    bj.textContent = jsdr + '%';
    b.appendChild(bj);
    b.appendChild(document.createElement('br'));
    b.appendChild(document.createTextNode('オフ'));
    
    b.title = '購入前に必ず公式情報をご確認ください';

    const color_hex =  (storage_items?.opt_bgcolor_hex) || '#FF0000';
    const rgb = hex2rgb(color_hex).map(v => Math.round(v/1.5)).join(',');
    b.style.backgroundColor = `rgba(${rgb})`;
    e.appendChild(b);
    return true;
}

// build and put a "this series has discounted items" badge
// "シリーズにセール作品があるよ" バッジ
function show_series_sale_badge(e) {
    if (!e) return false;
    const class_name = 'kiseppe-series-sale-badge';
    if (e.querySelector(`.${class_name}`)) return false;
    const b = document.createElement('span');
    b.classList.add(class_name);
    b.title = 'シリーズにセール作品あり';
    b.innerHTML = '🉐';
    e.appendChild(b);
    return true;
}

// build a price graph <dialog> and a button to display the <dialog>
// (generates a dialog to display a Price Graph iframe)
function build_price_graph_dialog(asin, title, pinfo={}) {
    let [pr, po] = [pinfo.price ?? '', pinfo.point ?? ''];

    // button to display a price graph <dialog>
    const pgb = document.createElement('span');
    pgb.classList.add("kiseppe-pg-btn");
    pgb.title = `価格推移グラフを表示します (price:${pr}, point:${po})`;
    pgb.innerText = '📈';
    
    // click => display a price graph <dialog>
    pgb.addEventListener('click', (event) => {
        const url = `${KS_IF_API}${asin}-${pr}-${po}`;
        console_log(url);

        // if no <dialog>, build it
        let pp = document.getElementById("popup_modal");
        if (!pp) {
            pp = document.createElement('dialog');
            pp.id = "popup_modal";
            pp.addEventListener('click', e => 
                e.target.closest('#pg_container') || pp.close());
            document.querySelector("noscript").before(pp);
        }

        // insert a graph content wrapper to <dialog>
        // <div id="pg_container">
        //   <div class="pg_item_info">
        //     <div class="pg_item_title">${title}</div>
        //     <iframe id="kiseppe" src="${url}" scrolling="no"></iframe>
        //   </div>
        //   <button onclick="document.getElementById('popup_modal').close()">Close</button>
        // </div>
        const pgContainer = document.createElement('div');
        pgContainer.id = 'pg_container';
        const pgItemInfo = document.createElement('div');
        pgItemInfo.className = 'pg_item_info';
        const pgItemTitle = document.createElement('div');
        pgItemTitle.className = 'pg_item_title';
        pgItemTitle.textContent = title;
        const iframe = document.createElement('iframe');
        iframe.id = 'kiseppe';
        iframe.src = url;
        iframe.scrolling = 'no';
        const closeButton = document.createElement('button');
        closeButton.className = 'pg_button_close';
        closeButton.textContent = '✖ 閉じる';
        closeButton.addEventListener('mouseover', () => closeButton.style.opacity = "0.5");
        closeButton.addEventListener('mouseout', () => closeButton.style.opacity = "1.0");
        closeButton.addEventListener('click', () => pp.close());
        pgItemInfo.appendChild(pgItemTitle);
        pgItemInfo.appendChild(iframe);
        pgContainer.appendChild(pgItemInfo);
        pgContainer.appendChild(closeButton);
        pp.innerHTML = '';
        pp.appendChild(pgContainer);

        document.getElementById("popup_modal").showModal();

        event.stopPropagation();
        event.preventDefault();
    });

    return pgb;
}


//// get hight of price graph for iframe
window.addEventListener('message', function(e) {
    const iframe = document.getElementById("kiseppe");
    if (! iframe) return;
    //console.log('e.data', e.data);
    if (e.data[0] === 'setHeight')
        iframe.style.height = e.data[1] + "px";
}, false);

// Insert a Price Graph iframe in an ASIN page (based on kiseppe 1.0's main())
function insert_price_graph(asin, pinfo) {
    console_log('kiseppe: insert price graph', asin);

    if (document.getElementById('kiseppe')) return false;

/*    //// get hight of iframe (use it later)
    window.addEventListener('message', function(e) {
        const iframe = document.getElementById("kiseppe");
        switch(e.data[0]) { // event name
        case 'setHeight':
            iframe.style.height = e.data[1] + "px";
            break;
        }
    }, false);
*/

    //// build API url (returns a web page for iframe)
    // To put the today's point on the graph, API needs price and point.
    const [price, point] = [pinfo.price ?? '', pinfo.point ?? ''];
    const url = `${KS_IF_API}${asin}-${price}-${point}`;
    console_log(url);
    
    //// display a price graph
    // build iframe
    const new_elm = document.createElement('div');
    const im = document.createElement('iframe');
    im.id = 'kiseppe';
    im.src = url;
    im.scrolling = 'no';
    new_elm.appendChild(im);

    // insert iframe
    // PC page: #ATFCriticalFeaturesDataContainer
    // SP page: #Northstar-Buybox-MobileWeb_feature_div
    const base_elm =
          document.querySelector('#ATFCriticalFeaturesDataContainer, ' +
                                 '#Northstar-Buybox-MobileWeb_feature_div');
    //const base_elm = document.getElementById('ATFCriticalFeaturesDataContainer');
    if (!base_elm) {
        console.error('ATFCriticalFeaturesDataContainer not found');
        return false;
    }
    base_elm.after(new_elm);

    return true;
}


////////////////////////////////////////////////////////////////
//// main
main();

