
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
//

const KS_IF_API = 'https://www.listasin.net/api/0000/chex/'; // iframe
const KS_JD_API = 'https://www.listasin.net/api/0199_jd.cgi?asins='; // json
const DEBUG_API = 'https://www.listasin.net/api/debug-logging.cgi?asins=';
const JSDR_CUTOFF = 15;

async function main() {

    const config = { childList: true, subtree: true };
    const generate_callback = (e, f) =>
          async function (mutations, observer) {
              // stop observation, do f(), and restart observation
              observer.disconnect(); // stop observation
              console.log('rebuild start');
              await f();
              console.log('rebuild end');
              observer.observe(e, config); // restart observation
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

    } else if (document.querySelector('[data-collection-asin]')) {

        console.log("kiseppe: here is Kindle Series Page");
        await kindle_series_page();

        const e = document.querySelector('div[id=series-childAsin-widget]');
        const callback = generate_callback(e, kindle_series_page);
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
        const ex = e.querySelector('div[data-csa-c-painter="banner-carousel-cards"]');
        const callback = async function (mutationsList, observer) {
            let is_mutation_detected = 0;
            for (let mutation of mutationsList) {
                if (ex.contains(mutation.target)) continue; // subtree to ignore
                is_mutation_detected = 1;
                break;
            }
            if (! is_mutation_detected) return;
            const f = generate_callback(e, kindle_horizontal_component);
            f(mutationsList, observer);
        };
        const observer = new MutationObserver(callback);
        observer.observe(e, config);

    } else if (document.querySelector('#nav-subnav[data-category=digital-text]')) {

        console.log("kiseppe: here is Kindle Store Page (Others)");
        kindle_horizontal_component();

    } else {

    }
}

main();

function get_asin_in_href(e) {
    let asin = '';
    if (! e || ! e.getAttribute('href')) return asin;
    const r = e.getAttribute('href').match(/(B[0-9A-Z]{9})/);
    if (r) asin = r[0];
    return asin;
}

function get_series_asin(e) {
    const c = e.querySelector("a[href*='binding=kindle_edition']");
    const srasin = get_asin_in_href(c);
    return [srasin, c];
}

//// Kindle ASIN page
// Ex. https://www.amazon.co.jp/dp/B0C5QMW1JY
async function kindle_asin_page() {
    const asin = document.getElementById('ASIN').value;
    if (! /^B[0-9A-Z]{9}$/.test(asin)) return;
    
    // call kiseppe 1.0 (kiseppe1.0::main() => asin_page_main())
    asin_page_main();

    // build API url
    const [collection_asin, c] = get_series_asin(document.body);
    const url = `${KS_JD_API}COL_${collection_asin},${asin}`;
    console.log(url);
    // access to API
    await fetch(url).then(r => r.json()).then(res => {
        console.log(res['result']['series']);
        const sd = res['result']['series'][collection_asin];
        if (sd && Number(sd) >= JSDR_CUTOFF)
            show_series_sale_badge(c);
    });
    return;
}


//// Kindle Author Component
// Ex. https://www.amazon.co.jp/kindle-dbs/entity/author/B004L41ULY
async function kindle_author_component() {
    // collect ASINs for API access and put price graph buttons
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
        
        // put a price graph button
        const item_title = c.getAttribute('aria-label');
        const pgd = build_price_graph_dialog(asin, item_title);
        cntn.style.position = "relative";
        cntn.appendChild(pgd);
    });
    if (alist.length == 0) return;
    
    // build API url
    const url = KS_JD_API + alist.join(",");
    console.log(url);
    
    // access to API
    await fetch(url).then(r => r.json()).then(res => {
        const ri = res['result']['items'];
        console.log(ri);
        // for all ASINs in API results
        Object.keys(ri).forEach(asin => {
            const cntn = document.querySelector(`div[data-asin=${asin}]`);
            if (Number(ri[asin]) >= JSDR_CUTOFF) {
                const ca = cntn.querySelector('a[aria-label]');
                show_jsdr_badge(ca, ri[asin], "0", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.2;
                cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
            }
        });
    });
    
    return;
}


//// Kindle Grid30 Page
// グリッド表示
// Ex. https://www.amazon.co.jp/kindle-dbs/browse?metadata=cardAppType&storeType=ebooks&sourceType=recs&widgetId=unified-ebooks-storefront-default_KindleUnlimitedCrossCategoryStrategyEbookSources
async function kindle_grid30_page() {
    const qs_grid30 = 'div[id="browse-views-area"] div[class*="browse-clickable-item"]';

    // get all ASINs
    const aset = new Set();
    document.querySelectorAll(qs_grid30).forEach(e => {
	const asin = get_asin_in_href(e.querySelector('a[href*="/B"]'));
	if (asin) aset.add(asin);
    });
    console.log("aset:", aset.size, aset);
    const asins = Array.from(aset);
    
    let res = {};
    let ri = {};
    if (asins.length > 0) {
        //// build API url and access
        const url = KS_JD_API + asins.flat().join(",");
        console.log(url);
        try {
            res = await fetch(url).then(r => r.json());
            ri = res['result']['items'];
        } catch (error) {
            console.error(error);
        }
    }
    
    asins.forEach(asin => {
        Array.from(document.querySelectorAll(
            qs_grid30 + ` a[href^="/gp/product/${asin}"][aria-label]`
        )).forEach(e => {
            console.log(asin, e);
            const cntn = e.closest('div[class*="browse-clickable-item"]');
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            const item_title = e.getAttribute('aria-label')
            if (item_title) {
                // put a price graph button
                const pgd = build_price_graph_dialog(asin, item_title);
                cntn.querySelector('div').style.position = "relative";
                cntn.querySelector('div').appendChild(pgd);

                if (ri[asin] && Number(ri[asin]) >= JSDR_CUTOFF) {
                    show_jsdr_badge(cntn, ri[asin], "0", "0");
                    // change background color
                    const toumei = Number(ri[asin]) / 100 * 0.2;
                    if (cntn.querySelector('div[class*="grid-view-item-unit"]')) {
                        cntn.style.background =
                            `linear-gradient(rgba(255,0,0,${toumei}), 80%, white)`;
                    } else {
                        cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
                    }
                }
            }
        });
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

    const aset = new Set();
    const aslist = [];
    const calist = [];
    e.querySelectorAll("h2 a[href]").forEach(e => {
	const asin = get_asin_in_href(e);
        if (! asin) return;
	const cntn = e.closest('div[class*="s-card-container"]');
	const [srasin, seri] = get_series_asin(cntn);
	if (srasin) calist.push(...['COL_' + srasin, asin]);
	else aslist.push(asin);
        aset.add(asin);
    });

    let res = {};
    let ri = {};
    let rs = {};
    if (aslist.length > 0) {
        // build API url
        const url = KS_JD_API + [aslist, calist].flat().join(",");
        console.log(url);
        // access to API
        try {
            res = await fetch(url).then(r => r.json());
            ri = res['result']['items'];
            rs = res['result']['series'];
        } catch (error) {
            console.error(error);
        }
    }
    console.log("a",aslist);
    console.log("c",calist);
    console.log("ri",ri);
    console.log("rs",rs);
    Array.from(aset).forEach(asin => {

        const e = document.querySelector(`h2 a[href*="/dp/${asin}"]`);
        if (! e) return;

        console.log('kiseppe: octopus-component', asin, e);
        const cntn = e.closest('div[class*="s-card-container"]');
        console.log(cntn);

        // put a price graph button
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        const item_title = e.textContent;
        if (! item_title) return;
        const pgd = build_price_graph_dialog(asin, item_title);
        cntn.style.position = "relative";
        cntn.appendChild(pgd);

	const [srasin, seri] = get_series_asin(cntn);
        if (srasin && rs && rs[srasin] && Number(rs[srasin]) >= JSDR_CUTOFF)
            show_series_sale_badge(seri);

        if (ri[asin] && Number(ri[asin]) >= JSDR_CUTOFF) {
            show_jsdr_badge(cntn, ri[asin], "0", "0");
            // change background color
            const toumei = Number(ri[asin]) / 100 * 0.2;
            cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
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
    const aset = new Set();
    document.querySelectorAll('div[class*="asin-container"] a[href]').forEach(e => {
	const asin = get_asin_in_href(e);
        if (asin) aset.add(asin);
    });
    console.log("aset:", aset.size, aset);
    const asins = Array.from(aset);

    let res = {};
    let ri = {};
    if (asins.length > 0) {
        // build API url
        const url = KS_JD_API + asins;
        console.log(url);
        // access to API
        try {
            res = await fetch(url).then(r => r.json());
            ri = res['result']['items'];
        } catch (error) {
            console.error(error);
        }
    }

    asins.forEach(asin => {
        if (e = document.querySelector(
            `div[class*="asin-container"] a[href*="/dp/${asin}"]`
        )) {
            console.log('kiseppe: Grid12', asin);
            const c = e.closest('div[class*="asin-container"]');

            // put a price graph button
            if (c.querySelector('.kiseppe-pg-btn')) return;
            const item_title = e.querySelector('img[alt]').getAttribute('alt');
            if (! item_title) return;
            const pgd = build_price_graph_dialog(asin, item_title);
            c.style.position = "relative";
            c.appendChild(pgd);

            if (ri[asin] && Number(ri[asin]) >= JSDR_CUTOFF) {
                show_jsdr_badge(c, ri[asin], "0", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.3;
                c.style.background =
                    `linear-gradient(rgba(255,0,0,${toumei}), 80%, white)`;
            }
        }
    });
    return;
}


//// Kindle Series Page
// ("collection" means "series")
async function kindle_series_page() {
    const srasin =
        document.querySelector('[data-collection-asin*="B"]').
        getAttribute('data-collection-asin');
    if (! srasin) return;

    // Ex. data-ajax-url="...B074V5W2R7,B074V3V9W5,B074V5W5GT"
    const aset = new Set();
    document.querySelectorAll('[data-ajax-url*="B"]').forEach(e => {
        const r = e.getAttribute('data-ajax-url').match(/(B[0-9A-Z]{9})/g);
	r.forEach(s => aset.add(s));
    });
    // all items (in this series) displayed on this page
    document.querySelectorAll('div[id^="series-childAsin-item_"]').forEach(e => {
        const co = e.querySelector(`a[class*="itemImageLink"][role="img"]`);
	const asin = get_asin_in_href(co);
	if (asin) aset.add(asin);
    });
    console.log(aset);
    const asins = Array.from(aset);

    // build API url
    const url = `${KS_JD_API}COL_${srasin},${asins}`;
    console.log(url);
    // access to API
    try {
        await fetch(url).then(r => r.json()).then(res => {
            console.log(res['result']);
            const sd = res['result']['series'][srasin];
            //// case: max real discount rate of series items >= x
            if (sd && Number(sd) >= JSDR_CUTOFF) {
                let c = document.getElementById('collection-masthead__title');
                if (! c) c = document.getElementById('collection-title');
                if (c) show_series_sale_badge(c.parentNode);
            }

            const ri = res['result']['items'];
            console.log(ri);
            // for all ASINs in API results
            Object.keys(ri).forEach(asin => {
                const co = document.querySelector(`a[href*="${asin}"][role="img"]`);
                if (! co) return;
                const cntn = co.closest('div[id^="series-childAsin-item_"]');
                if (cntn.querySelector('.kiseppe-pg-btn')) return;

                // put a price graph button
                const item_title = co.getAttribute('title');
                const pgd = build_price_graph_dialog(asin, item_title);
                cntn.style.position = "relative";
                cntn.appendChild(pgd);

                if (Number(ri[asin]) >= JSDR_CUTOFF) {
                    show_jsdr_badge(co, ri[asin], "0", "-4px");
                    // change background color
                    const toumei = Number(ri[asin]) / 100 * 0.2;
                    cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
                }
            });
        });
    } catch (error) {
        console.error(error);
    }
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
    const alist = [];
    document.querySelectorAll(
        'div[id^="p13n-asin-index-"]'
    ).forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;
        const co = e.querySelector('div[class^="p13n-sc-un"]');
        const asin = co.id;
        alist.push(asin);

        // put a price graph button
        const item_title = co.querySelector('img').getAttribute('alt');
        const pgd = build_price_graph_dialog(asin, item_title);
        e.style.position = "relative";
        e.appendChild(pgd);
    });
    const asins = alist.join(",");
    if (asins.length < 1) {
        console.log('do nothing for search results');
        return;
    }

    // build API url
    const url = KS_JD_API + asins;
    console.log(url);

    // access to API
    await fetch(url).then(r => r.json()).then(res => {
        const ri = res['result']['items'];
        console.log(ri);
        // for all ASINs in API results
        Object.keys(ri).forEach(asin => {
            const co = document.querySelector(`div[id="${asin}"]`);
            const cntn = co.closest('div[data-a-card-type]');
            if (Number(ri[asin]) >= JSDR_CUTOFF) {
                show_jsdr_badge(co, ri[asin], "0", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.2;
                cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
            }
        });
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
    const alist = [];
    const calist = [];
    document.querySelectorAll(
        'div[data-asin][data-component-type="s-search-result"]'
    ).forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;

        const asin = e.dataset.asin;

	const [srasin, seri] = get_series_asin(e);
        if (srasin) calist.push(...['COL_' + srasin, asin]);
	else alist.push(asin);

        // put a price graph button
        const item_title = e.querySelector('h2').textContent;
        const pgd = build_price_graph_dialog(asin, item_title);
        const c = e.querySelector('div[cel_widget_id]');
        c.style.position = "relative";
        c.appendChild(pgd);
    });
    const asins = [alist, calist].flat().join(",");
    if (asins.length < 1) {
        console.log('do nothing for search results');
        return;
    }

    // build API url
    const url = KS_JD_API + asins;
    console.log(url);
    // access to API
    await fetch(url).then(r => r.json()).then(res => {
        const ri = res['result']['items'];
        const rs = res['result']['series'];
        console.log('ri:', ri);
        console.log('rs:', rs);
        // for all ASINs in API results
        Object.keys(ri).forEach(asin => {
            const cntn = document.querySelector('div[data-asin="'+asin+'"]');

	    const [srasin, seri] = get_series_asin(cntn);
            if (srasin && rs && rs[srasin] && Number(rs[srasin]) >= JSDR_CUTOFF)
                show_series_sale_badge(seri);
            
            if (Number(ri[asin]) >= JSDR_CUTOFF) {
                const x = cntn.querySelector('img').closest('.sg-col-inner');
                show_jsdr_badge(x, ri[asin], "4px", "0");
                // change background color
                const c = cntn.querySelector('div[cel_widget_id]');
                const toumei = Number(ri[asin]) / 100 * 0.2;
                c.style.backgroundColor = `rgba(255,0,0,${toumei})`;
                if (c = cntn.querySelector('div[class*="-badge-container"]'))
                    c.style.backgroundColor = 'rgba(0,0,0,0)';
            }
        });
    });
    
    return;
}


//// Kindle Horizontal Component
async function kindle_horizontal_component() {

    // manga store ranking carousel
    const qs_ranking_area =
          'div[class^="_manga-genre-ranking-card_style_grid-container"]';
    if (document.querySelector(qs_ranking_area)) {
        const ca = document.querySelector(qs_ranking_area);
        //// manga-store ranking area
        // マンガストアトップ ランキング横スクロール表示
        // Ex. https://www.amazon.co.jp/kindle-dbs/manga-store/
        ca.querySelectorAll(
            `a[href*="/dp/B"] img[class*="_manga-genre-ranking-card_retail-item-style_book-cover"]`
        ).forEach(e => {

            ca.classList.add('kiseppe-debug');

	    const asin = get_asin_in_href(e.closest('a'));

	    const cntn = e.closest('div[id^="grid-item_"]');
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            // vvv  manga-store mateba-muryou's likes icon
            if (cntn.querySelector('img[alt="likes icon"]')) return;                

            console.log('kiseppe: manga-store ranking area', asin, e);
            const item_title = e.getAttribute('alt');
            if (item_title) {
                // put a price graph button
                const pgd = build_price_graph_dialog(asin, item_title);
                cntn.style.position = "relative";
                cntn.appendChild(pgd);
            }
        });

    }

    // general carousel
    // カテゴリTOP: div[class*="octopus-pc-card-content"]
    // ASIN page: %2Fdp%2FB00JGI56B0%2F

    const qs_carousel =
          'div[class*="a-carousel-row-inner"], ' +
          'div[class*="octopus-pc-card-content"]'
    document.querySelectorAll(qs_carousel).forEach(ca => {

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
	    const asin = get_asin_in_href(e.closest('a'));

            //console.log('kiseppe: horizontal', asin, e);
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

	    //console.log('kiseppe: horizontal', asin);
            const item_title = e.getAttribute('alt');
            if (item_title) {
                // put a price graph button
                const pgd = build_price_graph_dialog(asin, item_title);
                cntn.style.position = "relative";
                cntn.appendChild(pgd);
            }
        });
    });
    
    return;
};


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
function build_price_graph_dialog(asin, title) {

    // button to display a price graph <dialog>
    const b = document.createElement('span');
    b.classList.add("kiseppe-pg-btn");
    b.innerText = '📊';
    
    // click => display a price graph <dialog>
    b.addEventListener('click', (event) => {

        // build API url (returns a graph content for iframe)
        const url = KS_IF_API + asin + '--';
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

    return b;
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
    new_elm.innerHTML = '<iframe src="' + url + '" scrolling="no" id="kiseppe"></iframe>';

    // insert iframe
    let base_elm = document.getElementById('ATFCriticalFeaturesDataContainer');
    base_elm.after(new_elm);
};
