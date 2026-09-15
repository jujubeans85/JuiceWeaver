import config from './config.js';
import {applyBrand,mountBrand} from '../../foundation/brand.js';
applyBrand(config);mountBrand(document.querySelector('#brand'),config);
let count=0;document.querySelector('#tap').addEventListener('click',()=>document.querySelector('#count').textContent=++count);
