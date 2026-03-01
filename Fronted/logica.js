const items = document.querySelectorAll(".content");

window.addEventListener("scroll", () => {
    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        if(rect.left < window.innerWidth - 100){
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
        }
    });
});