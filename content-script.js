function main() {

    //// get hight of iframe : iframeの高さを得る（あとで）
    window.addEventListener('message', function(e) {
	var iframe = document.getElementById("kiseppe");
	switch(e.data[0]) { // event name
        case 'setHeight':
	    iframe.style.height = e.data[1] + "px";
	    break;
	}
    }, false);

    //// CHECK!!!  確認

    // Is this page is for Kindle Book?  Kindle本のページであるか
    if (! document.getElementById('nav-search-label-id').textContent.match(/Kindle/m)) return;

    // Does the page have ASIN?  ASINがあるか
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

main();
