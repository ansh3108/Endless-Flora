# The Infinite Garden

As the user scrolls, new procedurally generated plants, trees, or flowers sprout up on the screen. The visual structure of each plant (its height, number of leaves, flower color, branch angles) is determined mathematically by the exact pixel depth of the scroll bar.

## Features

* **DNA Engine:** The plants aren't picked from a list. The code mathematically generates brand new L-System grammars (branching rules, angles, depth limits) based on your exact pixel depth.
* **Infinite Scaling:** Every 15,000 pixels triggers a new "Epoch" with its own generated nomenclatur and color palette. You will never see the exact same biome twice.
* **Field Guide:** A progression log that records every new species you discover. 
* **Fast-Travel & Coordinate Sharing:** The UI ties directly to your URL hash (e.g., `/#45000`). Copy the URL to send a friend exactly what you're looking at, or click an entry in your Field Guide to instantly jump back to a saved depth.

## Inspiration

I wanted to create something calm and different from typical endless games. The idea was to turn simple scrolling into an endless journey through a procedurally generated world filled with unique plants and biomes. It also gave me a chance to explore procedural generation and build everything from scratch using Canvas and Vanilla JavaScript.

## Theme: Endless

The project follows the Endless theme by generating an infinite world that never repeats. As users continue descending, new biomes and plant species are discovered, creating a continuous sense of exploration. The Field Guide tracks these discoveries, rewarding curiosity and making every journey unique.

<img width="800" height="387" alt="ezgif-27bb976886051816" src="https://github.com/user-attachments/assets/695a6d89-0603-4ef8-b406-92ee0d28df48" />
