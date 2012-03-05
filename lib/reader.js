/*
 * Читаем файл и возвращаем объект
 */

var fs = require('fs'),
	Iconv = require('iconv').Iconv,
	url = require('url');

/*
 * Возвращаем последний индекс заголовка
 */
function findHeaderIndex(buffer) {
	var l = buffer.length,
		res = {
			si: 0, //Starting line index
			hi: 0 // head index
		},
		i,
		j;
	
	for (i = 0; l > i; i++) {
		
		if (!j && 0x0D === buffer[i] && 0x0A === buffer[i + 1]) {
			i += 1;
			j = i;
		}
		
		if (0x0D === buffer[i] && 0x0A === buffer[i + 1] && 0x0D === buffer[i + 2] && 0x0A === buffer[i + 3]) {
			i += 3;
			break;
		}
		
	}
	
	res.si = j;
	res.hi = i;
	
	return res;
}

function parseSLine(buffer) {
	var res = {
			type: null //тип запрос или овтет
		},
		str = buffer.toString('utf8'),
		arr = str.split(' '),
		isResponse = !!arr[0].match(/^HTTP\//),
		u, g;
		
	if (isResponse) {
		res.type = 'response';
		res.version = arr[0].replace(/^HTTP\//, '');
		res.statusCode = arr[1];
		res.reason = arr[2];
	} else {
		u = url.parse(arr[1]);
		
		g = u.pathname;
		g += u.search ? u.search : '';
		
		res.type = 'request';
		res.method = arr[0];
		res.url = g;
		res.version = arr[2].replace(/^HTTP\//, '');
	}
	
	return res;
}

function parseHeader(buffer) {
	var res = {},
		str = buffer.toString('utf8'),
		arr = str.split(/\r\n/),
		l = arr.length,
		arr2,
		i;
	
	for (i = 0; l > i; i += 1) {
		arr2 = arr[i].split(/:/);
		res[arr2[0]] = arr2[1].slice(1);
	}
	
	return res;
}

function parseBody(buffer, charset) {
	var res, convertor;
	
	if (buffer.length) {
		if ('utf8' !== charset) {
			convertor = new Iconv(charset || 'UTF-8', 'UTF-8');
			
			try {
				res = convertor.convert(buffer).toString('utf8');
			} catch (e) {
				res = buffer.toString('utf8');
			}
		} else {
			res = buffer.toString('utf8');
		}
	}
	
	return res;
}

function getEncode(header) {
	var res = 'utf8',
		ct = header['Content-Type'],
		charset = ct ? ct.match(/charset=(.*)/) : null;
	
	if (charset) {
		res = charset[1];
	}
	
	return res;
}

function reader(path, fn) {
	
	function onFileRead(err, buffer) {
		var sLine,
			header,
			body,
			sLineLength,
			headerLength,
			bodyLength,
			
			parsedLine,
			parsedHeadr,
			parsedBody,
			
			indexs,
			res;
		
		if (err) {
			fn(err);
		} else {
			indexs = findHeaderIndex(buffer);
			
			sLineLength = indexs.si - 2;
			headerLength = indexs.hi - indexs.si - 4;
			bodyLength = buffer.length - (indexs.hi + 1);
				
			sLine = new Buffer(sLineLength);
			header = new Buffer(headerLength);
			body = new Buffer(bodyLength);
			
			buffer.copy(sLine, 0, 0);
			buffer.copy(header, 0, indexs.si + 1);
			buffer.copy(body, 0, indexs.hi + 1);
			
			parsedLine = parseSLine(sLine);
			parsedHeader = parseHeader(header);
			parsedBody = parseBody(body, getEncode(parsedHeader));
			
			
			parsedHeader['Content-Length'] = body.length;
			
			res = {
				sline: parsedLine,
				header: parsedHeader,
				body: parsedBody,
				raw: {
					sline: sLine,
					header: header,
					body: body,
					file: buffer
				}
			};
			
			fn(null, res);
		}
	}
	
	fs.readFile(path, onFileRead);
}
module.exports = reader;