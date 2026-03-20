import { mount } from 'svelte';
import App from './App.svelte';
import '../../assets/tailwind.css';

mount(App, {
  target: document.getElementById('app')!,
});
