// Loads the Ace editor (served with the UI at app/js/vendor/ace) once.

let loading: Promise<NonNullable<Window["ace"]>> | null = null;

export function loadAce(): Promise<NonNullable<Window["ace"]>> {
    loading ??= new Promise(function(resolve, reject) {
        const script = document.createElement("script");
        script.src = "./app/js/vendor/ace/ace.js";
        script.onload = () => (window.ace ? resolve(window.ace) : reject(new Error("Ace did not load")));
        script.onerror = () => {
            loading = null;
            reject(new Error("Ace could not be loaded"));
        };
        document.head.append(script);
    });
    return loading;
}
