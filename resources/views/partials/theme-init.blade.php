{{-- Runs before first paint so the stored theme never flashes. Night is the house default. --}}
<script>
    (function () {
        var theme = 'dark';
        try {
            var stored = localStorage.getItem('rp-theme');
            if (stored === 'light' || stored === 'dark') theme = stored;
        } catch (e) {}
        var root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
    })();
</script>
