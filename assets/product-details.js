/** Pause/Play Button **/
$(".products-details-page .carousel-pause").click(function () {
    var id = $(this).attr("href");
    if ($(this).hasClass("pause")) {
        $(this).removeClass("pause").toggleClass("play");
        $(this).children(".sr-only").text("Play");
        $(id).carousel("pause");
    } else {
        $(this).removeClass("play").toggleClass("pause");
        $(this).children(".sr-only").text("Pause");
        $(id).carousel("cycle");
    }
    $(id).carousel;
});

/** Fullscreen Buttun **/
$(".products-details-page .carousel-fullscreen").click(function () {
    var id = $(this).attr("href");
    $(id).find(".active").ekkoLightbox({
        type: "image"
    });
});

if ($(".products-details-page [id^=carousel-thumbs] .carousel-item").length < 2) {
    $("#carousel-thumbs [class^=carousel-control-]").remove();
    $("#carousel-thumbs").css("padding", "0 5px");
}

$(".products-details-page #carousel").on("slide.bs.carousel", function (e) {
    var id = parseInt($(e.relatedTarget).attr("data-slide-number"));
    var thumbNum = parseInt(
        $("[id=carousel-selector-" + id + "]")
            .parent()
            .parent()
            .attr("data-slide-number")
    );
    $(".products-details-page [id^=carousel-selector-]").removeClass("selected");
    $(".products-details-page [id=carousel-selector-" + id + "]").addClass("selected");
    $(".products-details-page #carousel-thumbs").carousel(thumbNum);
});


// $(document).ready(function () {
//   setInterval(function () {
//       var button_add = $('.sticky-cart .btn-add-to-cart');
//       button_add.addClass('t4s-ani-shake');
//       setTimeout(function () {
//           button_add.removeClass('t4s-ani-shake');
//       }, 1500);
//   }, 3000);
// });

document.addEventListener("DOMContentLoaded", function () {
  const productButton = document.querySelector(".product-buttons-flex");
  const stickyCart = document.querySelector(".sticky-cart");

  function toggleStickyCart() {
      if (!productButton || !stickyCart) return;

      const buttonRect = productButton.getBoundingClientRect();

      const isButtonOutOfView = buttonRect.bottom < 0;

      if (isButtonOutOfView) {
          stickyCart.classList.add("active");
      } else {
          stickyCart.classList.remove("active");
      }
  }

  window.addEventListener("scroll", toggleStickyCart);
  toggleStickyCart();
});



