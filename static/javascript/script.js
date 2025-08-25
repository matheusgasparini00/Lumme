$(document).ready(function () {
  const sections = $('section');
  const navItems = $('.nav-item');

  if (sections.length > 0) {
    $(window).on('scroll', function () {
      const header = $('header');
      const scrollPosition = $(window).scrollTop() - header.outerHeight();
      let activeSectionIndex = 0;

      if (scrollPosition <= 0) {
        header.css('box-shadow', 'none');
      } else {
        header.css('box-shadow', '5px 1px 5px rgba(0, 0, 0, 0.2)');
      }

      sections.each(function (i) {
        const section = $(this);
        const sectionTop = section.offset().top - 96;
        const sectionBottom = sectionTop + section.outerHeight();

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          activeSectionIndex = i;
          return false;
        }
      });

      navItems.removeClass('active');
      $(navItems[activeSectionIndex]).addClass('active');
    });
  }

  try {
    if (window.ScrollReveal) {
      ScrollReveal().reveal('#cta', {
        origin: 'left',
        duration: 2000,
        distance: '20%',
      });

      ScrollReveal().reveal('.dish', {
        origin: 'left',
        duration: 2000,
        distance: '20%',
      });

      ScrollReveal().reveal('#financial_wallet', {
        origin: 'left',
        duration: 1000,
        distance: '20%',
      });

      ScrollReveal().reveal('.feedback', {
        origin: 'right',
        duration: 1000,
        distance: '20%',
      });
    }
  } catch (e) {
    console.warn('ScrollReveal not available:', e);
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const openBtn = document.getElementById('open_button');
  if (openBtn) {
    openBtn.addEventListener('click', function () {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('open-sidebar');
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const currentPath = new URL(location.href).pathname.replace(/\/+$/, '') || '/';

  const links = document.querySelectorAll('.nav-item > a, .side-item > a, .side-iten > a');
  let matched = false;

  links.forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    const linkPath = new URL(href, location.origin).pathname.replace(/\/+$/, '') || '/';
    const li = a.closest('.nav-item, .side-item, .side-iten');

    if (currentPath === linkPath || (linkPath !== '/' && currentPath.startsWith(linkPath))) {
      document.querySelectorAll('.nav-item.active, .side-item.active, .side-iten.active')
        .forEach(i => i.classList.remove('active'));
      li?.classList.add('active');
      matched = true;
    }
  });

  if (!matched && (currentPath === '/' || currentPath === '/index')) {
    const home = document.querySelector(
      '.nav-item > a[href="/"], .nav-item > a[href="/index"], ' +
      '.side-item > a[href="/"], .side-item > a[href="/index"], ' +
      '.side-iten > a[href="/"], .side-iten > a[href="/index"]'
    );
    home?.closest('.nav-item, .side-item, .side-iten')?.classList?.add('active');
  }
});

window.addEventListener('load', function () {
  document.body.style.visibility = 'visible';
});

function verificarSenhas() {
  const senha = document.getElementById('senha')?.value || '';
  const confirmar = document.getElementById('confirmar_senha')?.value || '';

  const regexSenhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  if (!regexSenhaForte.test(senha)) {
    alert('A senha deve ter no mínimo 8 caracteres e incluir letras maiúsculas, minúsculas, números e símbolos.');
    return false;
  }

  if (senha !== confirmar) {
    alert('As senhas não coincidem!');
    return false;
  }

  return true;
}

window.addEventListener('load', function () {
  const lumina = document.querySelector('.lumina-container');
  if (lumina) {
    lumina.style.visibility = 'visible';
    lumina.style.opacity = '1';
  }
});

window.addEventListener('DOMContentLoaded', function () {
  const track = document.querySelector('.carousel-track');
  if (!track) return;

  const cards = Array.from(track.children);
  if (!cards.length) return;

  const btnLeft = document.querySelector('.carousel-btn-left');
  const btnRight = document.querySelector('.carousel-btn-right');

  const cardWidth = cards[0].getBoundingClientRect().width + 20;
  let currentIndex = 0;

  btnRight?.addEventListener('click', () => {
    const container = document.querySelector('.carousel-track-container');
    if (!container) return;
    const visibleCards = Math.floor(container.offsetWidth / cardWidth);
    const maxIndex = cards.length - visibleCards;
    if (currentIndex < maxIndex) {
      currentIndex++;
      track.style.transform = `translateX(-${cardWidth * currentIndex}px)`;
    }
  });

  btnLeft?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      track.style.transform = `translateX(-${cardWidth * currentIndex}px)`;
    }
  });
});