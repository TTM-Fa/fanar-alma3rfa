import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Copy, Eye } from "lucide-react";

const CODE_SAMPLES = [
  {
    id: "fizzbuzz",
    title: "FizzBuzz Challenge",
    description: "Classic programming challenge with conditionals",
    code: `# FizzBuzz Challenge
for i in range(1, 21):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
  },
  {
    id: "even-odd",
    title: "Even/Odd Checker",
    description: "Function to check if numbers are even or odd",
    code: `# Check Even/Odd
def check_even(num):
    """Check if a number is even or odd"""
    return "Even" if num % 2 == 0 else "Odd"

result = check_even(7)
print(f"The number 7 is {result}")`,
  },
  {
    id: "fibonacci",
    title: "Fibonacci Sequence",
    description: "Generate Fibonacci numbers using iteration",
    code: `# Fibonacci Sequence
def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    a, b = 0, 1
    sequence = []
    while len(sequence) < n:
        sequence.append(a)
        a, b = b, a + b
    return sequence

fib_nums = fibonacci(10)
print("First 10 Fibonacci numbers:", fib_nums)`,
  },
  {
    id: "calculator",
    title: "Simple Calculator",
    description: "Basic arithmetic operations with error handling",
    code: `# Simple Calculator
def calculator(a, b, operation):
    """Perform basic arithmetic operations"""
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        return a / b if b != 0 else "Error: Division by zero"
    else:
        return "Invalid operation"

print(calculator(10, 5, '+'))
print(calculator(10, 0, '/'))`,
  },
  {
    id: "sorting",
    title: "Bubble Sort",
    description: "Classic sorting algorithm implementation",
    code: `# Bubble Sort Algorithm
def bubble_sort(arr):
    """Sort an array using bubble sort algorithm"""
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_numbers = bubble_sort(numbers.copy())
print("Original:", numbers)
print("Sorted:", sorted_numbers)`,
  },
  {
    id: "class-example",
    title: "Student Class",
    description: "Object-oriented programming with classes",
    code: `# Student Class Example
class Student:
    """A class to represent a student"""
    
    def __init__(self, name, age, grade):
        self.name = name
        self.age = age
        self.grade = grade
        self.subjects = []
    
    def add_subject(self, subject):
        """Add a subject to the student's list"""
        self.subjects.append(subject)
    
    def get_info(self):
        """Get student information"""
        return f"{self.name}, Age: {self.age}, Grade: {self.grade}"

# Create a student instance
student = Student("Ahmed", 16, "10th")
student.add_subject("Mathematics")
student.add_subject("Physics")
print(student.get_info())
print("Subjects:", student.subjects)`,
  },
];

export function CodeSamples({ onSelectSample, className = "" }) {
  const handleSampleSelect = (sample) => {
    onSelectSample(sample.code);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Code Samples</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CODE_SAMPLES.map((sample) => (
          <Card
            key={sample.id}
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
            onClick={() => handleSampleSelect(sample)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-600" />
                {sample.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 mb-3">{sample.description}</p>
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSampleSelect(sample);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Load
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(sample.code);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default CodeSamples;
