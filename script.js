// ---- Helpers
const $ = (q, p=document) => p.querySelector(q);
const $$ = (q, p=document) => [...p.querySelectorAll(q)];

// ---- Scroll progress
const progress = $('#progress');

function onScroll(){
  const h = document.documentElement;
  const scrolled = h.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  const pct = height > 0 ? (scrolled / height) * 100 : 0;
  progress.style.width = pct.toFixed(2) + '%';
}

// ---- Parallax glow on mouse move (subtle)
const glow = $('#glow');
let glowFrame = 0;
window.addEventListener('mousemove', (e)=>{
  if(!glow) return;
  if(glowFrame) return;
  glowFrame = requestAnimationFrame(() => {
    const x = (e.clientX / window.innerWidth - 0.5) * 18;
    const y = (e.clientY / window.innerHeight - 0.5) * 18;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    glowFrame = 0;
  });
}, { passive:true });

// ---- Hero slideshow
const heroMedia = $('#heroMedia');
const reviewsMedia = $('#reviewsMedia');

function initMediaSlideshow(mediaRoot){
  if(!mediaRoot) return;

  const slideSources = (mediaRoot.dataset.slides || '')
    .split(',')
    .map((src) => src.trim())
    .filter(Boolean);

  if(!slideSources.length) return;

  mediaRoot.replaceChildren();

  slideSources.forEach((src, index) => {
    const slide = document.createElement('div');
    slide.className = index === 0 ? 'hero-slide is-active' : 'hero-slide';
    slide.style.backgroundImage = `url("${src}")`;
    mediaRoot.appendChild(slide);
  });

  if(slideSources.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    return;
  }

  const slideEls = $$('.hero-slide', mediaRoot);
  let activeIndex = 0;

  window.setInterval(() => {
    const current = slideEls[activeIndex];
    activeIndex = (activeIndex + 1) % slideEls.length;
    const next = slideEls[activeIndex];

    current.classList.remove('is-active');
    next.classList.add('is-active');
  }, 4800);
}

function initReviewsMedia(){
  return;
}

function initHeroSlideshow(){
  initMediaSlideshow(heroMedia);
}

// ---- Gallery
// Replace these paths with the final photos when they are ready. The category
// value is kept in the markup so filters can be added later without a rebuild.
const galleryGrid = $('#galleryGrid');
const gallerySections = [
  { from: 1,  to: 6,  folder: 'ROOM1',          label:'Bedroom One', categories: ['interior', 'rooms'] },
  { from: 7,  to: 10, folder: 'ROOM2',          label:'Bedroom Two', categories: ['interior', 'rooms'] },
  { from: 11, to: 16, folder: 'ROOM3',          label:'Bedroom Three', categories: ['interior', 'rooms'] },
  { from: 17, to: 19, folder: 'LIVINGROOM',     label:'Living Room', categories: ['interior'] },
  { from: 20, to: 23, folder: 'TOILETS',        label:'Bathrooms', categories: ['interior'] },
  { from: 24, to: 33, folder: 'OUTSIDE HOME',   label:'Outdoor Living', categories: ['exterior'] },
  { from: 34, to: 39, folder: 'BALCONY',        label:'Balcony & Views', categories: ['exterior', 'sea-views'] },
  { from: 40, to: 46, folder: 'EXTERIOR',       label:'The Villa', categories: ['exterior'] },
  { from: 47, to: 48, folder: 'EXTERIOR NIGHT', label:'Evening Atmosphere', categories: ['exterior'] },
  { from: 49, to: 50, folder: 'EXTERIOR SEA',   label:'Beside the Aegean', categories: ['exterior', 'sea-views'] },
  { from: 51, to: 54, folder: 'DRONE',          label:'From Above', categories: ['exterior', 'sea-views'] }
];

const galleryPhotos = gallerySections.flatMap(section =>
  Array.from({ length: section.to - section.from + 1 }, (_, offset) => {
    const photoNumber = section.from + offset;
    const fileNumber = String(photoNumber).padStart(2, '0');
    return {
      src: `images/gallery-thumbs/${section.folder}/PHOTO${fileNumber}.jpg`,
      largeSrc: `images/gallery-large/${section.folder}/PHOTO${fileNumber}.jpg`,
      alt: `Platani Seaside Villa - photo ${photoNumber}`,
      label: section.label,
      shape: ['landscape', 'portrait', 'standard', 'wide', 'portrait', 'standard'][photoNumber % 6],
      categories: section.categories
    };
  })
);

if (galleryGrid) {
  galleryGrid.innerHTML = galleryPhotos.map((photo, index) => `
    <figure class="gallery-tile" data-category="${photo.categories.join(' ')}" data-label="${photo.label}" data-shape="${photo.shape}" data-large-src="${photo.largeSrc}">
      <img src="${photo.src}" alt="${photo.alt}" loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async"${index < 4 ? ' fetchpriority="high"' : ''}>
    </figure>
  `).join('');
}

// ---- Gallery filter (ready for filter buttons to be added later)
const filters = $$('.filter');
const items = $$('.gimg, .gallery-tile');
let visibleItems = [];

function buildVisible(){
  visibleItems = items.filter(el => el.style.display !== 'none');
}
function setFilter(f){
  filters.forEach(b => {
    const isActive = b.dataset.filter === f;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', String(isActive));
  });
  items.forEach(el=>{
    const categories = (el.dataset.category || '').split(' ');
    const ok = f === 'all' || categories.includes(f);
    el.style.display = ok ? 'block' : 'none';
  });
  buildVisible();
}
filters.forEach(b => b.addEventListener('click', ()=> setFilter(b.dataset.filter)));
setFilter('all');

// ---- Lightbox
const lb = $('#lightbox');
const lbImg = $('#lbImg');
const lbClose = $('#lbClose');
const lbPrev = $('#lbPrev');
const lbNext = $('#lbNext');
const lbCount = $('#lbCount');
let currentIndex = 0;

function showLB(i){
  if(!visibleItems.length) return;
  currentIndex = (i + visibleItems.length) % visibleItems.length;
  const img = visibleItems[currentIndex].querySelector('img');
  lbImg.classList.add('is-changing');
  window.setTimeout(() => {
    lbImg.src = visibleItems[currentIndex].dataset.largeSrc || img.src;
    lbImg.alt = img.alt;
    if(lbCount) lbCount.textContent = `${currentIndex + 1} / ${visibleItems.length}`;
    lbImg.classList.remove('is-changing');
  }, lb.classList.contains('open') ? 110 : 0);
}

function openLB(i){
  currentIndex = i;
  showLB(i);
  lb.classList.add('open');
  lb.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeLB(){
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  lbImg.src = '';
}
items.forEach(el=>{
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `Open ${el.querySelector('img')?.alt || 'photo'}`);
  el.addEventListener('click', ()=>{
    buildVisible();
    const idx = visibleItems.indexOf(el);
    openLB(Math.max(0, idx));
  });
  el.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      el.click();
    }
  });
});
if (lbClose) lbClose.addEventListener('click', closeLB);
if (lbPrev) lbPrev.addEventListener('click', ()=>showLB(currentIndex - 1));
if (lbNext) lbNext.addEventListener('click', ()=>showLB(currentIndex + 1));
if (lb) lb.addEventListener('click', (e)=>{ if(e.target === lb) closeLB(); });

if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  $$('.gallery-tile').forEach(tile => {
    let pointerFrame = 0;
    let latestPointerEvent = null;
    tile.addEventListener('pointermove', event => {
      latestPointerEvent = event;
      if(pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        const rect = tile.getBoundingClientRect();
        const x = (latestPointerEvent.clientX - rect.left) / rect.width - .5;
        const y = (latestPointerEvent.clientY - rect.top) / rect.height - .5;
        tile.style.setProperty('--gallery-pan-x', `${(x * -6).toFixed(2)}px`);
        tile.style.setProperty('--gallery-pan-y', `${(y * -6).toFixed(2)}px`);
        tile.style.setProperty('--gallery-light-x', `${((x + .5) * 100).toFixed(1)}%`);
        tile.style.setProperty('--gallery-light-y', `${((y + .5) * 100).toFixed(1)}%`);
        pointerFrame = 0;
      });
    }, { passive:true });
    tile.addEventListener('pointerleave', () => {
      if(pointerFrame){
        cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
      }
      tile.style.setProperty('--gallery-pan-x', '0px');
      tile.style.setProperty('--gallery-pan-y', '0px');
    });
  });
}

document.addEventListener('keydown', (e)=>{
  if(lb && lb.classList.contains('open')){
    if(e.key === 'Escape') closeLB();
    if(e.key === 'ArrowLeft') showLB(currentIndex - 1);
    if(e.key === 'ArrowRight') showLB(currentIndex + 1);
  }
});

// ---- Testimonials slider
let reviews = [];
const bookingReviewsLink = $('#bookingReviewsLink');
const airbnbReviewsLink = $('#airbnbReviewsLink');
const reviewText = $('#reviewText');
const reviewWho = $('#reviewWho');
const reviewNationality = $('#reviewNationality');
const reviewCounter = $('#reviewCounter');
const nextReviewArrow = $('#nextReviewArrow');
const contactLocationLink = $('#contactLocationLink');
let rIndex = 0;

const reviewLinks = {
  booking: 'https://www.booking.com/hotel/gr/platani-seaside-villa.en-gb.html#tab-reviews',
  airbnb: 'https://www.airbnb.com/rooms/1464374187190832972/reviews'
};

function syncReviewLinks(){
  if (bookingReviewsLink) {
    if (reviewLinks.booking) {
      bookingReviewsLink.href = reviewLinks.booking;
      bookingReviewsLink.classList.remove('is-disabled');
      bookingReviewsLink.setAttribute('aria-disabled', 'false');
    } else {
      bookingReviewsLink.href = '#';
      bookingReviewsLink.classList.add('is-disabled');
      bookingReviewsLink.setAttribute('aria-disabled', 'true');
    }
  }

  if (airbnbReviewsLink) {
    if (reviewLinks.airbnb) {
      airbnbReviewsLink.href = reviewLinks.airbnb;
      airbnbReviewsLink.classList.remove('is-disabled');
      airbnbReviewsLink.setAttribute('aria-disabled', 'false');
    } else {
      airbnbReviewsLink.href = '#';
      airbnbReviewsLink.classList.add('is-disabled');
      airbnbReviewsLink.setAttribute('aria-disabled', 'true');
    }
  }
}

function showReview(startIndex){
  if(!reviews.length) return;
  rIndex = (startIndex + reviews.length) % reviews.length;
  const review = reviews[rIndex];
  if (reviewText) {
    reviewText.textContent = `“${review.text}”`;
    reviewText.scrollTop = 0;
  }
  if (reviewWho) reviewWho.textContent = review.name || 'Guest';
  if (reviewNationality) reviewNationality.textContent = review.country || '';
  if (reviewCounter) reviewCounter.textContent = `${rIndex + 1} / ${reviews.length}`;
}

if (bookingReviewsLink) bookingReviewsLink.addEventListener('click', (e)=>{
  e.preventDefault();
  if(!reviewLinks.booking) return;
  const bookingTab = window.open(reviewLinks.booking, '_blank', 'noopener,noreferrer');
  if(bookingTab) bookingTab.opener = null;
});
if (airbnbReviewsLink) airbnbReviewsLink.addEventListener('click', (e)=>{ if(!reviewLinks.airbnb) e.preventDefault(); });
if (contactLocationLink) contactLocationLink.addEventListener('click', (e)=>{
  e.preventDefault();
  const locationTab = window.open(contactLocationLink.href, '_blank', 'noopener,noreferrer');
  if(locationTab) locationTab.opener = null;
});
if (nextReviewArrow) nextReviewArrow.addEventListener('click', ()=>showReview(rIndex + 1));
syncReviewLinks();

async function loadReviews(){
  try {
    const response = await fetch('reviews.json');
    if(!response.ok) throw new Error(`Reviews request failed: ${response.status}`);
    const data = await response.json();
    if(!Array.isArray(data) || !data.length) throw new Error('No reviews found');
    reviews = data;
    showReview(0);
  } catch (error) {
    if (reviewText) reviewText.textContent = 'Guest reviews are temporarily unavailable.';
    if (reviewCounter) reviewCounter.textContent = '';
    console.error(error);
  }
}

loadReviews();

// initial scroll state
// ---- Hero interactive scroll transition
const heroWrap = document.querySelector('.hero-wrap');
const heroSection = document.querySelector('#home');

function clamp01(x){
  return Math.max(0, Math.min(1, x));
}

function updateHeroTransition(){
  if(!heroWrap || !heroSection) return;

  const heroHeight = heroSection.offsetHeight || 1;
  const y = window.scrollY || 0;

  // πόσο γρήγορα να ολοκληρώνεται η μετάβαση
  const endPoint = Math.max(240, heroHeight * 0.55);

  const progress = clamp01(y / endPoint);

  heroWrap.style.setProperty('--p', progress.toFixed(4));
}

// ---- Scroll experience
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const lightweightHome = document.body.classList.contains('accommodation-page');
let scrollFrame = 0;
let lastScrollY = window.scrollY;

function initScrollExperience(){
  const revealEls = $$('.reveal');
  const staggerGroups = [
    ...$$('.amenities-grid'),
    ...$$('.editorial-amenities'),
    ...$$('.explore-more-grid'),
    ...$$('.city-story-gallery'),
    ...$$('.gallery-collage')
  ];

  revealEls.forEach((el, index) => {
    if(!el.dataset.reveal){
      if(el.matches('.city-story-copy, .collage-copy, .about-sanctuary-copy')){
        el.dataset.reveal = index % 2 ? 'right' : 'left';
      }else if(el.matches('.city-story-gallery, .collage-images, .about-architecture')){
        el.dataset.reveal = 'scale';
      }else{
        el.dataset.reveal = 'up';
      }
    }
  });

  staggerGroups.forEach(group => {
    [...group.children].forEach((child, index) => {
      child.classList.add('scroll-reveal-item');
      child.style.setProperty('--reveal-delay', `${Math.min(index, 9) * 55}ms`);
    });
  });

  const observed = [...new Set([...revealEls, ...$$('.scroll-reveal-item')])];
  if(reduceMotion.matches || !('IntersectionObserver' in window)){
    observed.forEach(el => el.classList.add('show'));
  }else{
    const revealObserver = new IntersectionObserver((entries, observer)=>{
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0.08 });
    observed.forEach(el => revealObserver.observe(el));
  }

  if(!lightweightHome){
    $$('.about-architecture figure, .collage-images, .city-story-gallery, .explore-card')
      .forEach((el, index) => {
        el.classList.add('scroll-media');
        el.dataset.parallaxSpeed = String(0.7 + (index % 3) * 0.18);
      });
  }
}

let scrollDirection = 1;
let directionCue;

function initDirectionalScroll(){
  const targets = $$([
    'section h2',
    '.collage-copy h3',
    '.city-story h2',
    '.gallery-mega-title',
    '.section-divider img',
    '.about-architecture figure'
  ].join(','));

  targets.forEach((el, index) => {
    el.classList.add('scroll-responsive');
    el.dataset.scrollDepth = String(0.72 + (index % 4) * .12);
  });

  directionCue = document.createElement('div');
  directionCue.className = 'scroll-direction-cue';
  directionCue.setAttribute('aria-hidden', 'true');
  directionCue.innerHTML = `
    <span class="scroll-direction-label">Scroll</span>
    <span class="scroll-direction-track"><i></i></span>
    <span class="scroll-direction-arrow">↓</span>
  `;
  document.body.appendChild(directionCue);
}

function updateDirectionalScroll(){
  if(reduceMotion.matches) return;
  const viewportCenter = window.innerHeight * .5;

  $$('.scroll-responsive').forEach(el => {
    const rect = el.getBoundingClientRect();
    if(rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
    const local = Math.max(-1, Math.min(1,
      (rect.top + rect.height * .5 - viewportCenter) / viewportCenter
    ));
    const depth = Number(el.dataset.scrollDepth || 1);

    el.style.setProperty('--direction-y', `${(local * -11 * depth).toFixed(2)}px`);
    el.style.setProperty('--direction-x', `${(local * 3.5 * depth).toFixed(2)}px`);
    el.style.setProperty('--direction-rotate', `${(local * -.45 * depth).toFixed(2)}deg`);
    el.style.setProperty('--viewport-progress', Math.abs(local).toFixed(3));
  });

  if(directionCue){
    directionCue.classList.toggle('is-up', scrollDirection < 0);
    directionCue.classList.toggle('is-visible', window.scrollY > 120);
    $('.scroll-direction-label', directionCue).textContent = scrollDirection < 0 ? 'Up' : 'Down';
    $('.scroll-direction-arrow', directionCue).textContent = scrollDirection < 0 ? '↑' : '↓';
  }
}

function updateParallax(){
  if(reduceMotion.matches) return;
  const viewportCenter = window.innerHeight / 2;
  $$('.scroll-media').forEach(el => {
    const rect = el.getBoundingClientRect();
    if(rect.bottom < -80 || rect.top > window.innerHeight + 80) return;
    const distance = (rect.top + rect.height / 2 - viewportCenter) / window.innerHeight;
    const speed = Number(el.dataset.parallaxSpeed || 1);
    el.style.setProperty('--media-shift', `${(distance * -18 * speed).toFixed(2)}px`);
  });
}

function updateScrollExperience(){
  scrollFrame = 0;
  const y = window.scrollY;
  const nav = $('#nav');
  if(Math.abs(y - lastScrollY) > 1) scrollDirection = y > lastScrollY ? 1 : -1;
  document.body.classList.toggle('is-scrolled', y > 40);
  document.body.classList.toggle('is-scrolling-down', y > lastScrollY && y > 180);
  document.body.classList.toggle('is-scrolling-up', y < lastScrollY && y > 40);
  if(nav) nav.style.setProperty('--scroll-drift', `${Math.min(10, y * 0.012).toFixed(2)}px`);
  lastScrollY = y;
  onScroll();
  updateHeroTransition();
  if(!lightweightHome){
    updateParallax();
    updateDirectionalScroll();
  }
}

function requestScrollUpdate(){
  if(!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollExperience);
}

window.addEventListener('scroll', requestScrollUpdate, { passive:true });
window.addEventListener('resize', requestScrollUpdate);
reduceMotion.addEventListener?.('change', requestScrollUpdate);
initScrollExperience();
if(!lightweightHome) initDirectionalScroll();
initReviewsMedia();
initHeroSlideshow();
updateScrollExperience();
if(window.lucide) lucide.createIcons();
