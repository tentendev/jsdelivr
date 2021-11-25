# How to host file on jsdelivr CDN

How to host my JS files online for private use ??? (yourjavascript.com) is not working

I want to upload my JS code file in a server a use it in by webpage as 

```
<script src="https://servername/main.js">
```

But i don't found the stuff that i want in Google so it request the sololearn user that if they know a free JS hosting website then Send me its link plzzz
Because my project had large amount of course code in js and i want to split it and use it a clean and lite way

#### Answer: You don't need to sign in. Just push your code to github and use the cdn :

```jsx

https://cdn.jsdelivr.net/gh/user/repo@version/file

```

here `user` should be replaced by your github username. `repo` should be replaced with name of your github repository. `@version` is optional but recommended. replace file by name of file that you want to use.
