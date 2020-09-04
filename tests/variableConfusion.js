const c = () =>{
  let a = 1;
  let b = [a, 2, 3];
  a = 4;
  console.log(b);
  console.log(a);
}

c();