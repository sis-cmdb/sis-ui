<!DOCTYPE html>
<html lang="en">
    <head>
        <title>{{ title }}</title>
        {% for script in scripts -%}
        <script src="{{ script }}"></script>
        {% endfor %}
        {%- for css_file in css -%}
        <link rel="stylesheet" href="{{ css_file }}">
        {% endfor -%}
        <link rel="icon", href="../common/images/favicon.ico", type="image/x-icon">
    </head>
    <body data-spy="scroll" data-target=".nav-toc">
        <header class='navbar navbar-default navbar-static-top'>
            <div class="container">
                <div class="navbar-header">
                    <a href="../" class="navbar-brand">SIS</a>
                </div>
                <div class="collapse navbar-collapse">
                    <ul class="nav navbar-nav">
                        <li class="active">
                            <a href='./'>API</a>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
        <div id='_root_div_'>
            {% include contentFile %}
        </div>
    </body>
</html>
