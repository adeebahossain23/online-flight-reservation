const navbarBottom = document.querySelector(".navbar-bottom");
const navbarToggler = document.querySelector(".navbar-toggler");

let count = 0;

if (navbarToggler) {
  navbarToggler.addEventListener(
    "click",
    (e) => {
      e.preventDefault();

      navbarBottom.classList.toggle("active");
    },
    false
  );
}
