// Initialize All Materialize Elements
$(document).ready(function() {
    M.AutoInit();
});

// Prevent Vertically Aligned Elements from Overflowing
$(document).ready(function() {
    console.log($(".valign-wrapper>.col").height(), $(window).height() - 100)
    if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
        $(".valign-wrapper").removeClass("valign-wrapper");
    }
});