$(document).ready(function(){

    const sections = $('section');
    const navItems = $('.nav-item');

    $(window).on('scroll', function() {
        const header = $('header');
        const scrollPosition = $(window).scrollTop() - header.outerHeight();
        let activeSectionIndex = 0;

        if(scrollPosition <= 0) {
            header.css('box-shadow', 'none');
        } else {
            header.css('box-shadow', '5px 1px 5px rgba(0, 0, 0, 0.2)');
        }

        sections.each(function(i){
            const section = $(this);
            const sectionTop = section.offset().top - 96;
            const sectionBottom = sectionTop + section.outerHeight();

            if(scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                activeSectionIndex = i;
                return false;
            }
        })

        navItems.removeClass('active');
        $(navItems[activeSectionIndex]).addClass('active');
    });

    ScrollReveal().reveal('#cta', {
        origin: 'left',
        duration: 2000,
        distance:'20%',
    });

    ScrollReveal().reveal('.dish', {
        origin: 'left',
        duration: 2000,
        distance:'20%',
    });

    ScrollReveal().reveal('#financial_wallet', {
        origin: 'left',
        duration: 1000,
        distance:'20%',
    });

    ScrollReveal().reveal('.feedback', {
        origin: 'right',
        duration: 1000,
        distance:'20%',
    });
});

document.getElementById('open_button').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open-sidebar');
})