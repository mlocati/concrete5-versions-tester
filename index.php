<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>concrete5 versions tester</title>
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="stylesheet" href="css/bootstrap.min.css">
		<link rel="stylesheet" href="css/chosen.min.css">
		<link rel="stylesheet" href="<?php echo 'css/main.css?v=' . @filemtime('css/main.css'); ?>">
	</head>
	<body>
		<div class="navbar navbar-default navbar-fixed-top">
			<div class="container">
				<div class="navbar-header">
					<a href="javascript:void(0)" class="navbar-brand">concrete5 versions tester</a>
					<div class="hide-until-ready">
						<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#top-menu">
							<span class="sr-only">Toggle navigation</span>
							<span class="icon-bar"></span>
							<span class="icon-bar"></span>
							<span class="icon-bar"></span>
						</button>
					</div>
				</div>
				<div class="hide-until-ready">
					<div class="collapse navbar-collapse" id="top-menu">
						<ul class="nav navbar-nav">
							<li><a href="#" data-toggle="modal" data-target="#dialog-options-versions">Versions</a></li>
						</ul>
					</div>
				</div>
			</div>
		</div>
		<div class="container">
			<div id="working"><div><div><div id="working-text" class="alert alert-info"></div></div></div></div>
			<div id="options" class="hide-until-ready">
				<form class="form-horizontal" role="form" id="options-form">
					<div class="form-group">
						<label class="col-sm-2 control-label">Operation</label>
						<div class="col-sm-10" id="options-operations"></div>
					</div>
				</form>
			</div>
		</div>

		<div id="result"></div>
		
		<div id="dialog-options-versions" class="modal fade" tabindex="-1">
			<div class="modal-dialog modal-md">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal">&times;</button>
						<h4 class="modal-title">Configure versions</h4>
					</div>
					<div class="modal-body">
						<h5>View versions (<a href="javascript:void(0)" onclick="$('#options-versions-list input').prop('checked', false);">none</a> | <a href="javascript:void(0)" onclick="$('#options-versions-list input').prop('checked', true);">all</a>)</h5>
						<ul id="options-versions-list"></ul>
						<h5>Sorting</h5>
						<ul>
							<li><div class="radio-inline"><label><input type="radio" name="options-versions-sorting" id="options-versions-asc"> oldest &rarr; newest</label></div></li>
							<li><div class="radio-inline"><label><input type="radio" name="options-versions-sorting" id="options-versions-desc"> newest &rarr; oldest</label></div></li>
						</ul>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
						<button type="button" class="btn btn-primary" id="options-versions-apply">Apply</button>
					</div>
				</div>
			</div>
		</div>

		<script src="js/jquery.min.js"></script>
		<script src="js/bootstrap.min.js"></script>
		<script src="js/chosen.jquery.min.js"></script>
		<script src="<?php echo 'js/main.js?v=' . @filemtime('js/main.js')?>"></script>
		<script>
(function(i,s,o,g,r,a,m) {
	i['GoogleAnalyticsObject'] = r;
	i[r] = i[r] || function() {
		(i[r].q=i[r].q||[]).push(arguments)
	},
	i[r].l=1*new Date();
	a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];
	a.async=1;
	a.src=g;
	m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-22235198-1', 'locati.it');
ga('send', 'pageview');
		</script>
</body>
</html>
