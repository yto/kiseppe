
// Kiseppe's target pages
//
// - Kindle ASIN Page
//   - [price-graph-iframe][series-jsdr]
// - Kindle Series Page
//   - [series-jsdr][price-graph-button][item-jsdr]
//   - onscroll
// - Kindle Search Page
//   - [price-graph-button][item-jsdr][series-jsdr]
//   - wait
// - Kindle Ranking Page
//   - [price-graph-button][item-jsdr]
//   - onscroll
// - Kindle Grid30 Page
//   - [price-graph-button][item-jsdr]
// - Kindle Store Page (others)
//   - horizontal
//     - [price-graph-button]
//     - onscroll (only manga-store)
//   - manga-store ranking area
//     - [price-graph-button]
//   - octopus-search
//     - [price-graph-button][item-jsdr][series-jsdr]
//     - wait
//   - grid12
//     - [price-graph-button][item-jsdr]
//     - wait
// - Kindle Author Page
//   - [price-graph-button][item-jsdr]
//

KS_IF_API = 'https://www.listasin.net/api/0000/chex/';
KS_JD_API = 'https://www.listasin.net/api/0199_jd.cgi?asins=';
DEBUG_API = 'https://www.listasin.net/api/debug-logging.cgi?asins=';

num_of_items_in_manga_store = 0;
document.onscroll = function() {
    if (/manga-store/.test(location.href)) {
        let n = Array.from(document.querySelectorAll('li a[href*="/dp/B"]')).length
        //console.log(num_of_items_in_manga_store, n);
        if (num_of_items_in_manga_store != n) {
            num_of_items_in_manga_store = n;
            kindle_horizontal_component();
        }
        return;
    }
}    


if (document.getElementById('ASIN')) {

    console.log("kiseppe: here is Kindle ASIN Page");
    kindle_asin_page();

} else if (/一覧.+著者/.test(document.querySelector('title').textContent)) {

    console.log("kiseppe: here is Kindle Author Page");
    kindle_author_page();

} else if (document.querySelector('div[id="browse-views-area"] div[class*="browse-clickable-item"]')) {

    console.log("kiseppe: here is Kindle Grid30 Page");
    kindle_grid30_page();

} else if (document.querySelector('[data-card-metrics-id*="octopus-search-result-card_"')) {

    console.log("kiseppe: here is Octpus Component");
    kindle_octopus_component();
    kindle_horizontal_component();

} else if (document.querySelector('div[class*="result-section"]') &&
           document.querySelector('div[id=search-results]')) {

    console.log("kiseppe: here is Grid12 Component");
    let e = document.querySelector('div[id=search-results]').parentNode;
    // 検索結果の動的表示の監視 - grid12
    let config = {
        childList: true,
        subtree: true
    };
    let observer = new MutationObserver(async function (mutations) {
        console.log('I\'m observing you!');
        //if (e.querySelector('.kiseppe-pg-btn')) return;
        console.log('rebuild grid12');
        observer.disconnect(); // 監視終了
        await kindle_grid12_component();
        console.log('rebuild grid12 end');
        observer.observe(e, config); // 監視開始
    });
    kindle_grid12_component();
    observer.observe(e, config);
    kindle_horizontal_component();

} else if (document.querySelector('[data-collection-asin]')) {

    console.log("kiseppe: here is Kindle Series Page");
    // 検索結果の動的表示の監視 - series
    let e = document.querySelector('div[id=series-childAsin-widget]');
    let config = {
        childList: true,
        subtree: true
    };
    let observer = new MutationObserver(async function (mutations) {
        console.log('I\'m observing you!');
        //if (e.querySelector('.kiseppe-pg-btn')) return;
        observer.disconnect(); // 監視終了
        console.log('[vvv] rebuild series');
        await kindle_series_page();
        console.log('[^^^] rebuild series end');
        observer.observe(e, config); // 監視開始
    });
    kindle_series_page();
    observer.observe(e, config);

} else if (document.querySelector('div#search') &&
           document.querySelector('div#nav-subnav[data-category="digital-text"]')
          ) {

    console.log("kiseppe: here is Kindle Search Page");
    let e = document.querySelector('div#search');
    // 検索結果の動的表示の監視 - search
    let config = {
        childList: true,
        subtree: true
    };
    let observer = new MutationObserver(async function (mutations) {
        console.log('I\'m observing you!');
        if (e.querySelector('.kiseppe-pg-btn')) return;
        observer.disconnect(); // 監視終了
        console.log('[vvv] rebuild search');
        await kindle_search_page();
        console.log('[^^^] rebuild search end');
        observer.observe(e, config); // 監視開始
    });
    observer.observe(e, config);

} else if (/(new-releases|bestsellers|movers-and-shakers)\/digital-text/.test(location.href)) {

    console.log("kiseppe: here is Kindle Ranking Page");
    // 動的表示の監視 - ranking
    e = document.querySelector('div.p13n-desktop-grid');
    let config = {
        childList: true,
        subtree: true
    };
    let observer = new MutationObserver(async function (mutations) {
        console.log('I\'m observing you!');
        console.log('[vvv] rebuild search');
        observer.disconnect(); // 監視終了
        await kindle_ranking_page();
        console.log('[^^^] rebuild search end');
        observer.observe(e, config); // 監視開始
    });
    kindle_ranking_page();
    observer.observe(e, config);

} else if (document.querySelector('#nav-subnav[data-category=digital-text]')) {

    console.log("kiseppe: here is Kindle Horizontal Component");
    kindle_horizontal_component();

} else {

}


//
// Kindle ASIN page
//
// Ex. https://www.amazon.co.jp/dp/B0C5QMW1JY
async function kindle_asin_page() {
    const asin = document.getElementById('ASIN').value;
    if (/^B[0-9A-Z]{9}$/.test(asin)) {
        // call kiseppe 1.0 (kiseppe1.0::main() => asin_page_main())
        asin_page_main();
        // build API url
        let c = document.querySelector("a[href*='binding=kindle_edition']");
        if (! c) return;
        let r = c.getAttribute('href').match(/(B0[0-9A-Z]{8})/);
        let collection_asin = r[0];
        const url = `${KS_JD_API}COL_${collection_asin},${asin}`;
        console.log(url);
        // access to API
        await fetch(url).then(r => r.json()).then(res => {
            console.log(res['result']['series']);
            const sd = res['result']['series'][collection_asin];
            //// case: real discount rate >= 15%
            if (sd && Number(sd) >= 15)
                show_series_sale_badge(c);
        });
        return;
    }
}


//
// Kindle Author page
//
// Ex. https://www.amazon.co.jp/kindle-dbs/entity/author/B004L41ULY
async function kindle_author_page() {
    // collect ASINs for API access and put price graph buttons
    const alist = [];
    document.querySelectorAll(
        'div[id=searchWidget] > div:not([role])'
    ).forEach(cntn => {
        if (cntn.querySelector('.kiseppe-pg-btn')) return;
        
        const c = cntn.querySelector('a[aria-label][href*="/B"]');
        if (! c) return; // not Kindle book
        const r = c.getAttribute('href').match(/\/(B[0-9A-Z]{9})/);
        const asin = r[1];
        alist.push(asin);
        cntn.dataset.asin = asin;
        
        // put a price graph button
        let item_title = c.getAttribute('aria-label');
        let pgd = build_price_graph_dialog(asin, item_title);
        pgd.style.position = "absolute";
        pgd.style.bottom = "0";
        pgd.style.left = "0";
        pgd.style.zIndex = "10000";
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
            //// case: real discount rate >= 15%
            if (Number(ri[asin]) >= 15) {
                // display real discount rate
                const cb = cntn.querySelector('a[aria-label]');
                show_jsdr_badge(cb, ri[asin], "0", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.2;
                cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
            }
        });
    });
    
    return;
}


//
// is Kindle Grid30 Page?
//
// グリッド表示
// Ex. https://www.amazon.co.jp/kindle-dbs/browse?metadata=cardAppType&storeType=ebooks&sourceType=recs&widgetId=unified-ebooks-storefront-default_KindleUnlimitedCrossCategoryStrategyEbookSources
async function kindle_grid30_page() {
    const qs_grid30 = 'div[id="browse-views-area"] div[class*="browse-clickable-item"]';

    // get all ASINs
    let aset = new Set();
    document.querySelectorAll(qs_grid30).forEach(e => {
        const c = e.querySelector('a[href*="/B"]');
        const url = c.getAttribute('href');
        const r = url.match(/\/(B0[0-9A-Z]{8})/);
        if (! r) return;
        aset.add(r[1]);
    });
    console.log("aset:", aset.size, aset);
    let asins = Array.from(aset);
    
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
            let cntn = e.closest('div[class*="browse-clickable-item"]');
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            let item_title = e.getAttribute('aria-label')
            if (item_title) {
                // put a price graph button
                let pgd = build_price_graph_dialog(asin, item_title);
                //e.parentNode.prepend(pgd);
                pgd.style.position = "absolute";
                pgd.style.bottom = "0";
                pgd.style.left = "0";
                pgd.style.zIndex = "10000";
                cntn.querySelector('div').style.position = "relative";
                cntn.querySelector('div').appendChild(pgd);
                
                //// case: real discount rate >= 15%
                if (ri[asin] && Number(ri[asin]) >= 15) {
                    // display real discount rate
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


//// octopus_component
// 特設ページなどの下の方に12個固定で表示されるやつ
// Ex. https://www.amazon.co.jp/b?node=22083216051
async function kindle_octopus_component() {
    let e = document.querySelector('[data-card-metrics-id*="octopus-search-result-card_"');

    console.log('octopus');
    // get all ASINs

    let aset = new Set();
    let aslist = [];
    let calist = [];
    e.querySelectorAll("h2 a[href]").forEach(e => {
        const url = e.getAttribute('href');
        const r = url.match(/\/(B0[0-9A-Z]{8})/);
        if (! r) return;
        const asin = r[1];
        // collect ASINs for API
        let cntn = e.closest('div[class*="s-card-container"]');
        let seri = cntn.querySelector('a[href*="kindle_edition"]');
        if (seri) {
            const r = seri.getAttribute('href').match(/\/(B0[0-9A-Z]{8})/);
            calist.push('COL_' + r[1]);
            calist.push(asin);
        } else {
            aslist.push(asin);
        }
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

        let e = document.querySelector(`h2 a[href*="/dp/${asin}"]`);
        if (e) {
            console.log('kiseppe: octopus-component', asin, e);
            let cntn = e.closest('div[class*="s-card-container"]');
            console.log(cntn);

            // put a price graph button
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            let item_title = e.textContent;
            if (! item_title) return;
            let pgd = build_price_graph_dialog(asin, item_title);
            pgd.style.paddingRight = "3px";
            //pgd.style.fontSize = "large";
            //e.parentNode.prepend(pgd);
            pgd.style.position = "absolute";
            pgd.style.bottom = "0";
            pgd.style.left = "0";
            pgd.style.zIndex = "10000";
            cntn.style.position = "relative";
            cntn.appendChild(pgd);

            //// case: max real discount rate of series items >= 15%
            let sr = cntn.querySelector('a[href*="binding=kindle_edition"]');
            console.log("sr:",sr);
            if (rs && sr) {
                let r = sr.getAttribute('href').match(/(B0[0-9A-Z]{8})/);
                let srasin = r[0];
                if (rs[srasin] && Number(rs[srasin]) >= 15)
                    show_series_sale_badge(sr);
            }

            //// case: real discount rate >= 15%
            if (ri[asin] && Number(ri[asin]) >= 15) {
                // display real discount rate
                show_jsdr_badge(cntn, ri[asin], "0", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.2;
                cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
            }
        }

    });

    return;
}


//// Grid12
// 「セール＆キャンペーン」ページなどで表示される検索結果表示
// Ex. https://www.amazon.co.jp/hko/deals/?_encoding=UTF8
async function kindle_grid12_component() {
    let e = document.querySelector('div[id=search-results]').parentNode;
    // get all ASINs
    let aset = new Set();
    document.querySelectorAll('div[class*="asin-container"] a[href]').forEach(e => {
        const url = e.getAttribute('href');
        const r = url.match(/\/(B0[0-9A-Z]{8})/);
        if (r) aset.add(r[1]);
    });
    console.log("aset:", aset.size, aset);
    let asins = Array.from(aset);

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
            let c = e.closest('div[class*="asin-container"]');

            // put a price graph button
            if (c.querySelector('.kiseppe-pg-btn')) return;
            item_title = e.querySelector('img[alt]').getAttribute('alt');
            if (! item_title) return;
            let pgd = build_price_graph_dialog(asin, item_title);
            pgd.style.position = "absolute";
            pgd.style.bottom = "0";
            pgd.style.left = "0";
            pgd.style.zIndex = "10000";
            c.style.position = "relative";
            c.appendChild(pgd);

            //// case: real discount rate >= 15%
            if (ri[asin] && Number(ri[asin]) >= 15) {
                // display real discount rate
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


//
// is Kindle Series Page?
//
// ("collection" means "series")
async function kindle_series_page() {
    let srasin =
        document.querySelector('[data-collection-asin*="B"]').
        getAttribute('data-collection-asin');
    if (! srasin) return;

    // Ex. data-ajax-url="...B074V5W2R7,B074V3V9W5,B074V5W5GT"
    let aset = new Set();
    document.querySelectorAll('[data-ajax-url*="B"]').forEach(e => {
        const u = e.getAttribute('data-ajax-url');
        const r = u.match(/(B[0-9A-Z]{9})/g);
        r.forEach(s => aset.add(s));
    });
    // all items (in this series) displayed on this page
    document.querySelectorAll('div[id^="series-childAsin-item_"]').forEach(e => {
        const co = e.querySelector(`a[class*="itemImageLink"][role="img"]`);
        const r = co.getAttribute('href').match(/\/(B0[0-9A-Z]{8})/);
        if (r) aset.add(r[1]);
    });
    console.log(aset);
    let asins = Array.from(aset);

    // build API url
    const url = `${KS_JD_API}COL_${srasin},${asins}`;
    console.log(url);
    // access to API
    try {
        await fetch(url).then(r => r.json()).then(res => {
            console.log(res['result']);
            const sd = res['result']['series'][srasin];
            //// case: max real discount rate of series items >= 15%
            if (sd && Number(sd) >= 15) {
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
                let item_title = co.getAttribute('title');
                let pgd = build_price_graph_dialog(asin, item_title);
                //co.parentNode.appendChild(pgd);
                //cntn.querySelector('div[class*=series-childAsin-count').appendChild(pgd);
                pgd.style.position = "absolute";
                pgd.style.bottom = "0";
                pgd.style.left = "0";
                pgd.style.zIndex = "10000";
                cntn.style.position = "relative";
                cntn.appendChild(pgd);

                //// case: real discount rate >= 15%
                if (Number(ri[asin]) >= 15) {
                    // display real discount rate
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
        let item_title = co.querySelector('img').getAttribute('alt');
        let pgd = build_price_graph_dialog(asin, item_title);
        //co.appendChild(pgd);
        pgd.style.position = "absolute";
        pgd.style.bottom = "0";
        pgd.style.left = "0";
        pgd.style.zIndex = "10000";
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
            //// case: real discount rate >= 15%
            if (Number(ri[asin]) >= 15) {
                // display real discount rate
                show_jsdr_badge(co, ri[asin], "0", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.2;
                cntn.style.backgroundColor = `rgba(255,0,0,${toumei})`;
            }
        });
    });

    return;
}


//
// is Kindle Search Page?
//
// Ex. https://www.amazon.co.jp/s?rh=n%3A2410280051&fs=true
async function kindle_search_page() {

    const asinatsu_sleep = ms => new Promise(res => setTimeout(res, ms));

    console.log("wait a few seconds");
    await asinatsu_sleep(2000);
    console.log("ok, go!");

    // collect ASINs for API access and put price graph buttons
    let alist = [];
    let calist = [];
    document.querySelectorAll(
        'div[data-asin][data-component-type="s-search-result"]'
    ).forEach(e => {
        if (e.querySelector('.kiseppe-pg-btn')) return;

        let asin = e.dataset.asin;

        // collect ASINs for API
        let seri = e.querySelector('a[href*="kindle_edition"]');
        if (seri) {
            const r = seri.getAttribute('href').match(/\/(B0[0-9A-Z]{8})/);
            calist.push("COL_" + r[1]);
            calist.push(asin);
        } else {
            alist.push(asin);
        }

        // put a price graph button
        let item_title = e.querySelector('h2').textContent;
        let pgd = build_price_graph_dialog(asin, item_title);
        //pgd.style.paddingRight = "3px";
        //pgd.style.fontSize = "large";
        //e.querySelector('h2').prepend(pgd);
        pgd.style.position = "absolute";
        pgd.style.bottom = "0";
        pgd.style.left = "0";
        pgd.style.zIndex = "10000";
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

            //// case: max real discount rate of series items >= 15%
            let sr = cntn.querySelector('a[href*="binding=kindle_edition"]');
            if (rs && sr) {
                let r = sr.getAttribute('href').match(/(B0[0-9A-Z]{8})/);
                let srasin = r[0];
                if (rs[srasin] && Number(rs[srasin]) >= 15)
                    show_series_sale_badge(sr);
            }
            
            //// case: real discount rate >= 15%
            if (Number(ri[asin]) >= 15) {
                // display real discount rate
                let x = cntn.querySelector('img').closest('.sg-col-inner');
                show_jsdr_badge(x, ri[asin], "4px", "0");
                // change background color
                const toumei = Number(ri[asin]) / 100 * 0.2;
                let c = cntn.querySelector('div[cel_widget_id]');
                c.style.backgroundColor = `rgba(255,0,0,${toumei})`;
                if (c = cntn.querySelector('div[class*="-badge-container"]'))
                    c.style.backgroundColor = 'rgba(0,0,0,0)';
            }
        });
    });
    
    return;
}


//
// is Kindle Horizontal Component
//
async function kindle_horizontal_component() {

    // get all ASINs
    let aset = new Set();
    document.querySelectorAll("a[href]").forEach(e => {
        const url = e.getAttribute('href');
        const r = url.match(/\/(B0[0-9A-Z]{8})/);
        if (r) aset.add(r[1]);
    });
    console.log("aset:", aset.size, aset);
    let asins = Array.from(aset);

    asins.forEach(asin => {

        //// manga-store ranking area
        // マンガストアトップ横スクロール表示 => ページの動的読み込みあり
        // Ex. https://www.amazon.co.jp/kindle-dbs/manga-store/
        Array.from(document.querySelectorAll(
            `a[href*="/dp/${asin}"] img[class*="_manga-genre-ranking-card_retail-item-style_book-cover"]`
        )).forEach(e => {
            console.log('kiseppe: manga-store ranking area', asin, e);
            let cntn = e.closest('div[id^="grid-item_"]');
            // vvv  manga-store mateba-muryou's likes icon
            if (cntn.querySelector('img[alt="likes icon"]')) return;                
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            let item_title = e.getAttribute('alt');
            if (item_title) {
                // put a price graph button
                let pgd = build_price_graph_dialog(asin, item_title);
                pgd.style.position = "absolute";
                pgd.style.bottom = "0";
                pgd.style.left = "0";
                pgd.style.zIndex = "10000";
                cntn.style.position = "relative";
                cntn.appendChild(pgd);
            }
        });

        //// horizontal
        // キンドルトップ横スクロール表示
        // Ex. https://www.amazon.co.jp/s?node=2275256051
        // 横並びだけどスクロールしないやつ
        // Ex. https://www.amazon.co.jp/b?node=2292699051
        Array.from(document.querySelectorAll(
            `li a[href*="/dp/${asin}"] img[alt], li a[href^="/gp/product/${asin}"] img[alt]`
        )).forEach(e => {
            //console.log('kiseppe: horizontal', asin, e);
            if (/image-ku/.test(e.getAttribute('src'))) return;
            let cntn = e.closest('li');
            // vvv  manga-store big banner
            if (/banner-/.test(cntn.getAttribute("class"))) return;
            // vvv  manga-store mateba-muryou's likes icon
            if (cntn.querySelector('img[alt="likes icon"]')) return;                
            // vvv  manga-store collection ASIN
            if (cntn.querySelector('span[class*="collection-type"]')) return;
            if (cntn.querySelector('.kiseppe-pg-btn')) return;
            //console.log('kiseppe: horizontal', asin);
            let item_title = e.getAttribute('alt');
            if (item_title) {
                // put a price graph button
                let pgd = build_price_graph_dialog(asin, item_title);
                pgd.style.position = "absolute";
                pgd.style.bottom = "0";
                pgd.style.left = "0";
                pgd.style.zIndex = "10000";
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
        let jh = document.createElement('div');
        jh.classList.add(class_name);
        // vvv   move these lines to css file later
        jh.style.position = "absolute";
        jh.style.padding = "2px 4px";
        jh.style.lineHeight = "1.2em";
        jh.style.textAlign = "center";
        jh.style.fontSize = "x-small";
        jh.style.backgroundColor = 'brown';
        jh.style.color = 'white';
        // ^^^   move these lines to css file later
        jh.style.top = yp;
        jh.style.right = xp;
        jh.innerHTML = `実質<br><b>${jsdr}%</b></br>オフ`;
        e.style.position = "relative";
        e.appendChild(jh);
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
        let jh = document.createElement('span');
        jh.classList.add(class_name);
        jh.title = 'シリーズにセール作品あり';
        jh.innerHTML = '🉐';
        e.appendChild(jh);
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
    //console.log('hello');

    // button to display a price graph <dialog>
    let d = document.createElement('span');
    d.classList.add("kiseppe-pg-btn");
    d.style.zIndex = "100000";
    d.style.cursor = "pointer";
    d.innerText = '📊';
    
    // click => display a price graph <dialog>
    d.addEventListener('click', (event) => {

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
<style>
dialog#popup_modal { border: none; border-radius: 8px; }
dialog#popup_modal::backdrop { background: rgba(0,0,0,.5); }
#pg_container { width: 850px; text-align: center; }
#pg_container .pg_item_info { height: 400px; }
#pg_container .pg_item_title { font-weight: bold; margin-bottom: 0.5rem;
  text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
#pg_container iframe {width: 100%; height: 100%; border: 0; overflow: visible;}
</style>
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

    return d;
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
    new_elm.innerHTML = '<iframe style="width: 100%; height: 0px; border: 0; overflow: hidden;" src="' + url + '" scrolling="no" id="kiseppe"></iframe>';

    // insert iframe
    let base_elm = document.getElementById('ATFCriticalFeaturesDataContainer');
    base_elm.after(new_elm);
};
