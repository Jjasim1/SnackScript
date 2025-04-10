# SnackScript

![logo](https://github.com/Jjasim1/SnackScript/blob/main/docs/logo.png)

A programming language project for CMSI 3802
Written By: Jody Jasim, Taylor Musso, Matthew De Jesus 

## Introduction
Long ago, a mother and her child were traveling multiple days across the cold, icy plains in search of finding safety from a terrible war. Suddenly, the mother had collapsed - putting both in a terrible situation. Far from any sort of civilization, there seemed to be no hope. Fate did not abandon them though; a wizard had found them and started casting his scripts. After teleporting them all to a warm house, the wizard used magic to create a warm meal for both. Before leaving them behind, he left the child with the magic stones that were used to help them out. Years later, the child had grown up and harnessed the magic within to make sure that no one was left hungry. With SnackScript, wizards and chefs alike can now write code in the form of recipes and use magic to compile them to make whatever they wish for. 

Check out SnackScript here: https://msyu04.github.io/SnackScriptWebsite/

## Features
- Static Typing
- Mix of JS and Python
- Boolean Operators
- Comments
- Functions
- Loops
...

## Examples

### Defining and Calling a Function

<table>
<tr> <th>SnackScript</th><th>JavaScript</th><tr>
</tr>
<td>

```SnackScript
🥘 say_hello:
  🍦 This is a single line comment
  🍨 This is a
     multi-line comment
     :) 🍨
  🍽️ "Hello, world"
;

say_hello()
```

</td>

<td>

```
function say_hello() {
console.log("hello, world");
}

say_hello();
```

</td>
</table>

### Nested Loops (Multiplication Table)

<table>
<tr> <th>SnackScript</th><th>JavaScript</th><tr>
</tr>
<td>

```SnackScript
🍥 (🍳 i = 1, i <= 10, i++):
  🍳 row = ""
  🍥 (🍳 j = 1, j <= 10, j++):
    row += (i * j) + "\t"
  ;
  🍽️ row
;
```

</td>

<td>

```
for (let i = 1; i <= 10; i++) {
  let row = "";
  for (let j = 1; j <= 10; j++) {
    row += (i * j) + "\t";
  }
  console.log(row);
```

</td>
</table>

### Recursion (Fibonacci)

<table>
<tr> <th>SnackScript</th><th>JavaScript</th><tr>
</tr>
<td>

```SnackScript
🥘 fib (🍳 n) :
  🍳 a = 0, b = 1, f = 1
  🍥 (🍳 i = 2, i < n, i++):
    f = a + b
    a = b
    b = f
  🫗 f
  ;
;
```

</td>

<td>

```
var fib = function(n) {
  var a = 0, b = 1, f = 1;
  for (var i = 2; i < n; i++) {
    f = a + b;
    a = b;
    b = f;
  }
  return f;
};
```

</td>
</table>

### Lists and Dictionaries

<table>
<tr> <th>SnackScript</th><th>Python</th><tr>
</tr>
<td>

```SnackScript
🥡 student_scores = [ ("Annie", 91), ("Barbara", 58), ("Charlie", 49), ("Daniel", 51) ]
🥘 determine_grade(score):
  🧁 score >= 90:
    🫗 "A"
  ;
  🍰 score >= 80:
    🫗 "B"
  ;
  🍰 score >= 70:
    🫗 "C"
  ;
  🍰 score >= 60:
    🫗 "D"
  ;
  🎂:
    🫗 "F"
  ;
;
🍱 student_grades = {name: determine_grade(score) for name, score in student_scores}
🍥 student, grade in student_grades.🥚:
  🍽️ student + ":" + grade
;
```

</td>

<td>

```
student_scores = [ ('Annie', 91), ('Barbara', 58), ('Charlie', 49), ('Daniel', 51) ]
def determine_grade(score):
  if score >= 90:
    return 'A'
  elif score >= 80:
    return 'B'
  elif score >= 70:
    return 'C'
  elif score >= 60:
    return 'D'
  else:
    return 'F'

student_grades = {name: determine_grade(score) for name, score in student_scores}

print("Student Grades:")
for student, grade in student_grades.items():
  print(student + ":" + grade)
```

</td>
</table>

### Classes

<table>
<tr> <th>SnackScript</th><th>Python</th><tr>
</tr>
<td>

```SnackScript
🫙 Car:
  🥘 _init_ (self, make, model, year):
    self.make = make
    self.model = model
    self.year = year
    self.engine_started = 🍲
  ;

  🥘 start_engine(self):
    🧁 not self.engine_started:
      self.engine_Started = 🥗
      🍽️ "Started the engine for the", self.year, self.make, self.model
    ;
    🎂:
      🍽️ "The engine is already running"
    ;
  ;

  🥘 stop_engine(self):
    🧁 self.engine_started:
      self.engine_started = 🍲
      🍽️ "Stopped the engine for the", self.year, self.make, self.model
    ;
    🎂:
      🍽️ "The engine is already stopped"
    ;
  ;
;
```

</td>

<td>

```
class Car:
  def __init__(self, make, model, year):
    self.make = make
    self.model = model
    self.year = year
    self.engine_started = False

  def start_engine(self):
    if not self.engine_started:
      self.engine_started = True
      print("Started the engine for the", self.year, self.make, self.model)
    else:
      print("The engine is already running")

  def stop_engine(self):
    if self.engine_started:
      self.engine_started = False
      print("Stopped the engine for the", self.year, self.make, self.model)
    else:
      print("The engine is already stopped")
```

</td>
</table>

