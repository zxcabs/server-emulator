var fs = require('fs'),
	reader = require('./lib/reader'),
	httpServer = require('./lib/httpServer');

	
/*
 * возвращаем массив содержащий разобранные файлы
 */
function readDir(dir, fn) {
	var result = []
		len = 0;
	
	function parse(req, res) {
		len += 1;
		var rq, rs;
		
		function end() {
			len -= 1;
			result.push({req: rq, res: rs});
			
			if (!len) {
				fn(null, result);
			}
		}
		
		reader(req, function (err, data) {
			rq = data;
			if (rs) {
				end();
			}
		});
		
		reader(res, function (err, data) {
			rs = data;
			if (rq) {
				end();
			}
		});
	}
	
	function onRead(err, files) {
		var req, res, i, l, f;
		
		if (err) {
			fn(err);
		} else {
			files.sort();
			l = files.length;
			
			for (i = 0; l > i; i++) {
				f = files[i];
				
				debugger;
				
				if (f.match(/\d+_c.txt/)) {
					req = dir + '/' + f;
				} else if (f.match(/\d+_s.txt/)) {
					res = dir + '/' + f;
				}
				
				if (req && res) {
					parse(req, res);
					req = null;
					res = null;
				}
			}
		}
	}
	
	fs.readdir(dir, onRead);
}


console.log('read dir');
readDir('./data', function (err, data) {
	var server;
	
	if (err) {
		console.log(err);
	} else {
		console.log('creat server');
		server = httpServer(data, {delay: 0});
		
		if (server) {
			server.listen(9999);
			console.log('server started');
		} else {
			console.log('Server error');
		}
	}
});