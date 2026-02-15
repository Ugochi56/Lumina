(function () {
    // Configuration from SASS variables
    const config = {
        starFieldWidth: 2560,
        starFieldHeight: 2560,
        starStartOffset: 2560, // Matches height for seamless loop
        starOne: { count: 1700, size: 1, duration: 100 },
        starTwo: { count: 700, size: 2, duration: 125 },
        starThree: { count: 200, size: 3, duration: 175 }
    };

    function createShadows(count) {
        let shadows = [];
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * config.starFieldWidth);
            const y = Math.floor(Math.random() * config.starFieldHeight);
            shadows.push(`${x}px ${y}px #FFF`);
        }
        return shadows.join(', ');
    }

    const css = `
        body {
            background: transparent !important;
        }

        .starfield-container {
            position: fixed;
            top: 0; 
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, #020107 0%, #201b46 100%);
            z-index: -2; /* Behind everything */
            overflow: hidden;
            pointer-events: none;
        }

        .stars, .stars2, .stars3 {
            position: absolute;
            background: transparent;
            border-radius: 50%;
            z-index: -1;
        }

        .stars::after, .stars2::after, .stars3::after {
            content: " ";
            position: absolute;
            top: 2560px; /* Offset by height to loop */
            width: inherit;
            height: inherit;
            background: transparent;
            border-radius: 50%;
            box-shadow: inherit;
        }

        /* Star Layer 1 */
        .stars {
            width: ${config.starOne.size}px;
            height: ${config.starOne.size}px;
            box-shadow: ${createShadows(config.starOne.count)};
            animation: animStar ${config.starOne.duration}s linear infinite;
        }

        /* Star Layer 2 */
        .stars2 {
            width: ${config.starTwo.size}px;
            height: ${config.starTwo.size}px;
            box-shadow: ${createShadows(config.starTwo.count)};
            animation: animStar ${config.starTwo.duration}s linear infinite;
        }

        /* Star Layer 3 */
        .stars3 {
            width: ${config.starThree.size}px;
            height: ${config.starThree.size}px;
            box-shadow: ${createShadows(config.starThree.count)};
            animation: animStar ${config.starThree.duration}s linear infinite;
        }

        @keyframes animStar {
            from { transform: translateY(0px); }
            to { transform: translateY(-2560px); }
        }
    `;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Inject HTML
    const container = document.createElement('div');
    container.className = 'starfield-container';
    container.innerHTML = `
        <div class="stars"></div>
        <div class="stars2"></div>
        <div class="stars3"></div>
    `;

    // Prepend to body so it sits behind content
    document.body.prepend(container);

})();
