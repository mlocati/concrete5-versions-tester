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
					<?php if(false) { ?>
						<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
							<span class="sr-only">Toggle navigation</span>
							<span class="icon-bar"></span>
							<span class="icon-bar"></span>
							<span class="icon-bar"></span>
						</button>
					<?php } ?>
				</div>
				<?php if(false) { ?>
					<div class="collapse navbar-collapse">
						<ul class="nav navbar-nav">
							<li class="active"><a href="#">Home</a></li>
						</ul>
					</div>
				<?php } ?>
			</div>
		</div>
		<div class="container">
			<div id="working"><div><div><div id="working-text" class="alert alert-info"></div></div></div></div>
			<div id="options" class="hide">
				<form class="form-horizontal" role="form" id="options-form">
					<div class="form-group">
						<label class="col-sm-2 control-label">Operation</label>
						<div class="col-sm-10" id="options-operations"></div>
					</div>
				</form>
			</div>
		</div>
		<div id="result"></div>
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
