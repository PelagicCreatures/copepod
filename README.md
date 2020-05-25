# @PelagicCreatures/Copepod

### Observable Objects for end to end data binding

[Demo Page](https://blog.PelagicCreatures.com/demos/copepod)

### Status: under active development. More soon.

Classes that implements proxied objects for client, server data binding

#### Copepod
Uses javascript Proxy and Reflect to observe changes to an object's properties

```
const testing = new Copepod('testing')
testing.bind((property,value) => {
	console.log('changed:',property, value)
})



```
@author Michael Rhodes
@license MIT
Made in Barbados 🇧🇧 Copyright © 2020 Michael Rhodes
```

Install in your project
```
npm install @PelagicCreatures/Sargasso
npm install @PelagicCreatures/Copepod
```

Quick HTML example using CDN:
```html
todo
```
