document.addEventListener('DOMContentLoaded', () => {
    const tryButtons = document.querySelectorAll('button');

    // Find buttons that navigate to login.html
    tryButtons.forEach(btn => {
        const onClick = btn.getAttribute('onclick');
        if (onClick && onClick.includes('login.html')) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', async () => {
                try {
                    const res = await fetch('/auth/status');
                    const data = await res.json();

                    if (data.authenticated) {
                        window.location.href = '/myalbums.html';
                    } else {
                        window.location.href = '/login.html';
                    }
                } catch (e) {
                    window.location.href = '/login.html';
                }
            });
        }
    });

    // Find anchor tags that navigate to login.html
    const tryLinks = document.querySelectorAll('a[href="login.html"]');
    tryLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const res = await fetch('/auth/status');
                const data = await res.json();

                if (data.authenticated) {
                    window.location.href = '/myalbums.html';
                } else {
                    window.location.href = '/login.html';
                }
            } catch (err) {
                window.location.href = '/login.html';
            }
        });
    });
});
