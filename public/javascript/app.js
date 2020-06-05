const updates = document.querySelector('.updates');
const events = document.querySelector('.events');
const hr1 = document.querySelector('#hr1');
const hr2 = document.querySelector('#hr2');
const text1 = document.querySelector('.text1');
const text2 = document.querySelector('.text2');
const iframe = document.querySelector('iframe');


updates.addEventListener('click', () => {
    visibility(hr1, hr2);
    visibility(text1, text2);
});

events.addEventListener('click', () => {
    visibility(hr2, hr1);
    visibility(text2, text1);
});


function visibility(active, inactive){
    active.style.display = 'flex';
    inactive.style.display = 'none';
}


