/*
 * Поднимаем http сервер, на вход получаем распарсенные объекты, на выходе объект сервер
 */

var http = require('http'),
	Iconv = require('iconv').Iconv,
	acaHeader = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
		'Access-Control-Allow-Methods': 'POST, GET, DEL, PUT'
	};

function mix(a, b) {
	var aKeys = Object.keys(a),
		bKeys = Object.keys(b),
		obj = {},
		l, key;
	
	for (l = aKeys.length; l--; ) {
		key = aKeys[l];
		obj[key] = a[key];
	}
	
	for (l = bKeys.length; l--; ) {
		key = bKeys[l];
		obj[key] = b[key];
	}
	
	return obj;	
}
	
function makePattern(str) {
	var pattern,
		regReg = /{{[\w\d?.*^\/|\\()\[\]\s+]+}}/g,
		encReg = /([.?{}\|\[\]*^()])/g,
		regArr = str.match(regReg),
		strArr = str.split(regReg),
		regFirst = !!str.match(/^{{[\w\d?.*^\/|\()\[\]\s]+}}/),
		i;
	
	str = str.replace(/[\r\n]/g, '');
	
	if (regArr && regArr.length) {
		pattern = [];
		
		if (regFirst) {
			i = regArr.shift();
			strArr.shift();
			
			while (i) {
				pattern.push(i.replace(/^{{|}}$/g, ''));
				pattern.push(strArr.shift().replace(encReg, '\\$1'));
				i = regArr.shift();
			}
			
		} else {
			pattern.push(strArr.shift().replace(encReg, '\\$1'));
			i = regArr.shift();
			
			while (i) {
				pattern.push(i.replace(/^{{|}}$/g, ''));
				pattern.push(strArr.shift().replace(encReg, '\\$1'));
				i = regArr.shift();
			}
		}
		
		pattern = pattern.join('');
	} else {
		pattern = str.replace(encReg, '\\$1');
	}
	
	return pattern;
}

function httpServer(arr, opt) {
	opt = opt || {};
	
	function equal(a, b) {
		var result = false,
			pattern,
			urlPattern = makePattern(b.sline.url),
			method = a.method;
			
		
		if (method.match(b.menhod, 'i') && !!a.url.match((urlPattern + '$').replace(/\\/, '\\'))) {
			
			switch (method) {
			case 'GET':
				result = true;
				break;
			case 'POST':
				if (a.data && b.body) {
					pattern = makePattern(b.body).replace(/[\r\n]/g, '');
					result = !!a.data.replace(/[\r\n]/g, '').match(pattern, 'i');
				}
				break;
			}
		}		
		
		return result;
	}
	
	function responser(req, res) {
		var l = arr.length,
			elem,
			notFound = true,
			l;
		
		while (l--) {
			elem = arr[l];
			
			if (equal(req, elem.req)) {
		
				if (opt.acao) {
					res.writeHead(200, mix(elem.res.header, {'Access-Control-Allow-Origin': '*'}));
				} else {	
					res.writeHead(200, elem.res.header);
				}
				
				res.end(elem.res.raw.body);
				notFound = false;
				break;
			}
		}
		
		if (notFound) {
					
			if (opt.acao && req.method.match(/options/i)) {
				res.writeHead(200, acaHeader);
			} else {
				res.writeHead(404);
			}
				
			res.end('Not found');
		}
	}
	
	function handler(req, res) {
		var rq = {},
			data = new Buffer(0);
		
		req.on('data', function (chunk) {
			var buff = new Buffer(data.length + chunk.length);
			data.copy(buff);
			chunk.copy(buff, data.length);
			data = buff;
		});
		
		req.on('end', function () {
			var type = req.headers['content-type'],
				charcode,
				icon;
			
			if (data.length && type && type.match(/(text\/xml)|(application\/xml)/)) {
				charcode = type.match(/charset=(.*)/);
				charcode = charcode ? charcode[1] : 'utf8';
				rq.charcode = charcode;
				
				if ('utf8' === charcode) {
					rq.data = data.toString('utf8')
				} else {
					icon = new Iconv(charcode, 'utf8');
					rq.data = icon.convert(data).toString('utf8')
				}
			}
			
			rq.__proto__ = req;
			
			console.log('request: ' + rq.method + ' ' + rq.url);
			setTimeout(function () {
				responser(rq, res);
			}, opt.delay || 0);
		});
	}
	
	return http.createServer(handler);
}
module.exports = httpServer;