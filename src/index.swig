<!DOCTYPE html>
<html lang="en" ng-app="sisui">
  <head>
    <title>SIS</title>
    {% for script in scripts -%}
    <script src="{{ script }}"></script>
    {% endfor %}
    {%- for css_file in css -%}
    <link rel="stylesheet" href="{{ css_file }}">
    {% endfor -%}
    <link rel="icon" href="./common/images/favicon.ico" type="image/x-icon" />
  </head>
  <body data-target=".nav-toc">
    <header class="navbar navbar-default navbar-static-top">
      <div class="container">
        <div class="navbar-header"><a href="./" class="navbar-brand">SIS</a></div>
        <div class="collapse navbar-collapse">
          <ul class="nav navbar-nav">
            <li><a href="./docs">API</a></li>
          </ul>
        </div>
      </div>
    </header>
    <div class="container">
      <div class="row">
        <div ng-view class="col-md-9"></div>
        <ng-include src="'app/partials/sidebar.html'"></ng-include>
      </div>
    </div>
    <div class="footer">
        <div class="container">
            <ng-include src="'app/partials/footer.html'"></ng-include>
        </div>
    </div>
  </body>
</html>
