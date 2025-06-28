import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Eye,
  Copy,
  Star,
  Clock,
  BarChart3,
  Zap,
  BookOpen,
  Layers,
  Target,
} from "lucide-react";

const ENHANCED_CODE_SAMPLES = [
  {
    id: "fizzbuzz",
    title: "FizzBuzz Challenge",
    description: "Classic programming interview question with conditionals",
    difficulty: "Beginner",
    category: "Logic",
    estimatedTime: "5 min",
    icon: Target,
    tags: ["loops", "conditionals", "modulo"],
    code: `# FizzBuzz Challenge - Print numbers 1-20 with special rules
# Replace multiples of 3 with "Fizz", multiples of 5 with "Buzz"
# Replace multiples of both with "FizzBuzz"

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
    id: "fibonacci",
    title: "Fibonacci Sequence",
    description: "Generate Fibonacci numbers using iteration",
    difficulty: "Intermediate",
    category: "Algorithms",
    estimatedTime: "8 min",
    icon: BarChart3,
    tags: ["algorithms", "sequences", "iteration"],
    code: `# Fibonacci Sequence Generator
# Each number is the sum of the two preceding ones

def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        next_num = sequence[i-1] + sequence[i-2]
        sequence.append(next_num)
    
    return sequence

# Generate first 10 Fibonacci numbers
fib_nums = fibonacci(10)
print("First 10 Fibonacci numbers:", fib_nums)

# Calculate the golden ratio approximation
if len(fib_nums) > 1:
    ratio = fib_nums[-1] / fib_nums[-2]
    print(f"Golden ratio approximation: {ratio:.6f}")`,
  },
  {
    id: "sorting",
    title: "Bubble Sort Algorithm",
    description: "Classic sorting algorithm with visualization",
    difficulty: "Intermediate",
    category: "Algorithms",
    estimatedTime: "10 min",
    icon: Layers,
    tags: ["sorting", "algorithms", "optimization"],
    code: `# Bubble Sort Algorithm with step-by-step visualization
# Compares adjacent elements and swaps them if needed

def bubble_sort_verbose(arr):
    """Sort array using bubble sort with detailed output"""
    n = len(arr)
    arr_copy = arr.copy()  # Don't modify original
    
    print(f"Starting array: {arr_copy}")
    print("-" * 40)
    
    for i in range(n):
        swapped = False
        print(f"Pass {i + 1}:")
        
        for j in range(0, n - i - 1):
            print(f"  Comparing {arr_copy[j]} and {arr_copy[j + 1]}")
            
            if arr_copy[j] > arr_copy[j + 1]:
                # Swap elements
                arr_copy[j], arr_copy[j + 1] = arr_copy[j + 1], arr_copy[j]
                swapped = True
                print(f"  → Swapped! Array: {arr_copy}")
            else:
                print(f"  → No swap needed")
        
        if not swapped:
            print(f"  No swaps in this pass - array is sorted!")
            break
        
        print(f"End of pass {i + 1}: {arr_copy}")
        print()
    
    return arr_copy

# Test the algorithm
numbers = [64, 34, 25, 12, 22, 11, 90]
print("Original array:", numbers)
print()
sorted_numbers = bubble_sort_verbose(numbers)
print("Final sorted array:", sorted_numbers)`,
  },
  {
    id: "class-student",
    title: "Student Management System",
    description: "Object-oriented programming with classes and methods",
    difficulty: "Advanced",
    category: "OOP",
    estimatedTime: "15 min",
    icon: BookOpen,
    tags: ["classes", "oop", "methods", "data-structures"],
    code: `# Student Management System using OOP principles
# Demonstrates class creation, inheritance, and method implementation

class Person:
    """Base class for all persons in the system"""
    
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def get_info(self):
        return f"Name: {self.name}, Age: {self.age}"

class Student(Person):
    """Student class inheriting from Person"""
    
    def __init__(self, name, age, student_id, grade_level):
        super().__init__(name, age)
        self.student_id = student_id
        self.grade_level = grade_level
        self.subjects = {}
        self.attendance = []
    
    def add_subject(self, subject, grade=None):
        """Add a subject with optional grade"""
        self.subjects[subject] = grade
        print(f"Added {subject} to {self.name}'s subjects")
    
    def update_grade(self, subject, grade):
        """Update grade for a specific subject"""
        if subject in self.subjects:
            old_grade = self.subjects[subject]
            self.subjects[subject] = grade
            print(f"Updated {subject}: {old_grade} → {grade}")
        else:
            print(f"Subject {subject} not found")
    
    def calculate_gpa(self):
        """Calculate GPA from letter grades"""
        grade_points = {'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0}
        
        valid_grades = [grade for grade in self.subjects.values() if grade in grade_points]
        
        if not valid_grades:
            return 0.0
        
        total_points = sum(grade_points[grade] for grade in valid_grades)
        return total_points / len(valid_grades)
    
    def get_info(self):
        """Override parent method with student-specific info"""
        base_info = super().get_info()
        gpa = self.calculate_gpa()
        return f"{base_info}, ID: {self.student_id}, Grade: {self.grade_level}, GPA: {gpa:.2f}"

# Create and test student objects
student1 = Student("Ahmed Ali", 16, "STU001", "10th")
student2 = Student("Fatima Hassan", 17, "STU002", "11th")

# Add subjects and grades
student1.add_subject("Mathematics", "A")
student1.add_subject("Physics", "B")
student1.add_subject("Chemistry", "A")

student2.add_subject("Mathematics", "B")
student2.add_subject("Literature", "A")
student2.add_subject("History", "B")

# Display student information
print("\\nStudent Information:")
print("-" * 50)
print(student1.get_info())
print(f"Subjects: {student1.subjects}")
print()
print(student2.get_info())
print(f"Subjects: {student2.subjects}")

# Update a grade
print("\\nUpdating grade...")
student1.update_grade("Physics", "A")
print(f"New GPA for {student1.name}: {student1.calculate_gpa():.2f}")`,
  },
  {
    id: "api-weather",
    title: "Weather Data Processor",
    description: "Data processing and analysis with error handling",
    difficulty: "Advanced",
    category: "Data Processing",
    estimatedTime: "12 min",
    icon: Zap,
    tags: ["data-processing", "error-handling", "statistics"],
    code: `# Weather Data Processor with Error Handling
# Processes temperature data and generates statistics

import json
from datetime import datetime, timedelta

class WeatherProcessor:
    """Process and analyze weather data"""
    
    def __init__(self):
        self.data = []
        self.processed_data = {}
    
    def add_reading(self, temperature, humidity, timestamp=None):
        """Add a weather reading with validation"""
        try:
            # Validate temperature range (-50°C to 60°C)
            if not -50 <= temperature <= 60:
                raise ValueError(f"Temperature {temperature}°C is outside valid range")
            
            # Validate humidity range (0% to 100%)
            if not 0 <= humidity <= 100:
                raise ValueError(f"Humidity {humidity}% is outside valid range")
            
            # Use current time if no timestamp provided
            if timestamp is None:
                timestamp = datetime.now()
            
            reading = {
                'temperature': temperature,
                'humidity': humidity,
                'timestamp': timestamp,
                'heat_index': self._calculate_heat_index(temperature, humidity)
            }
            
            self.data.append(reading)
            print(f"Added reading: {temperature}°C, {humidity}% at {timestamp.strftime('%H:%M')}")
            
        except ValueError as e:
            print(f"Error adding reading: {e}")
    
    def _calculate_heat_index(self, temp_c, humidity):
        """Calculate heat index (feels-like temperature)"""
        # Convert to Fahrenheit for calculation
        temp_f = (temp_c * 9/5) + 32
        
        if temp_f < 80:
            return temp_c  # Heat index only relevant for higher temperatures
        
        # Simplified heat index formula
        hi = (-42.379 + 2.04901523 * temp_f + 10.14333127 * humidity - 
              0.22475541 * temp_f * humidity - 6.83783e-3 * temp_f**2 - 
              5.481717e-2 * humidity**2 + 1.22874e-3 * temp_f**2 * humidity + 
              8.5282e-4 * temp_f * humidity**2 - 1.99e-6 * temp_f**2 * humidity**2)
        
        # Convert back to Celsius
        return round((hi - 32) * 5/9, 1)
    
    def analyze_data(self):
        """Generate comprehensive weather statistics"""
        if not self.data:
            print("No data to analyze")
            return
        
        temperatures = [reading['temperature'] for reading in self.data]
        humidities = [reading['humidity'] for reading in self.data]
        heat_indices = [reading['heat_index'] for reading in self.data]
        
        self.processed_data = {
            'total_readings': len(self.data),
            'temperature_stats': {
                'min': min(temperatures),
                'max': max(temperatures),
                'average': sum(temperatures) / len(temperatures),
                'range': max(temperatures) - min(temperatures)
            },
            'humidity_stats': {
                'min': min(humidities),
                'max': max(humidities),
                'average': sum(humidities) / len(humidities)
            },
            'comfort_analysis': self._analyze_comfort(heat_indices)
        }
        
        return self.processed_data
    
    def _analyze_comfort(self, heat_indices):
        """Analyze comfort levels based on heat index"""
        comfort_levels = []
        
        for hi in heat_indices:
            if hi < 27:
                comfort_levels.append('Comfortable')
            elif hi < 32:
                comfort_levels.append('Caution')
            elif hi < 40:
                comfort_levels.append('Extreme Caution')
            else:
                comfort_levels.append('Danger')
        
        # Count occurrences
        comfort_counts = {}
        for level in comfort_levels:
            comfort_counts[level] = comfort_counts.get(level, 0) + 1
        
        return comfort_counts
    
    def generate_report(self):
        """Generate a formatted weather report"""
        if not self.processed_data:
            self.analyze_data()
        
        if not self.processed_data:
            return "No data available for report"
        
        report = []
        report.append("=" * 50)
        report.append("WEATHER ANALYSIS REPORT")
        report.append("=" * 50)
        
        # Temperature statistics
        temp_stats = self.processed_data['temperature_stats']
        report.append(f"\\nTemperature Analysis ({self.processed_data['total_readings']} readings):")
        report.append(f"  • Minimum: {temp_stats['min']}°C")
        report.append(f"  • Maximum: {temp_stats['max']}°C")
        report.append(f"  • Average: {temp_stats['average']:.1f}°C")
        report.append(f"  • Range: {temp_stats['range']}°C")
        
        # Humidity statistics
        hum_stats = self.processed_data['humidity_stats']
        report.append(f"\\nHumidity Analysis:")
        report.append(f"  • Minimum: {hum_stats['min']}%")
        report.append(f"  • Maximum: {hum_stats['max']}%")
        report.append(f"  • Average: {hum_stats['average']:.1f}%")
        
        # Comfort analysis
        comfort = self.processed_data['comfort_analysis']
        report.append(f"\\nComfort Level Distribution:")
        for level, count in comfort.items():
            percentage = (count / self.processed_data['total_readings']) * 100
            report.append(f"  • {level}: {count} readings ({percentage:.1f}%)")
        
        return "\\n".join(report)

# Example usage
print("Weather Data Processing Example")
print("-" * 40)

processor = WeatherProcessor()

# Add sample weather readings
sample_data = [
    (25, 60), (28, 65), (32, 70), (29, 55),
    (26, 80), (31, 75), (33, 85), (27, 45)
]

print("Adding weather readings...")
for temp, humidity in sample_data:
    processor.add_reading(temp, humidity)

print("\\nGenerating analysis...")
processor.analyze_data()

print("\\n" + processor.generate_report())`,
  },
];

const DIFFICULTY_COLORS = {
  Beginner: "bg-green-100 text-green-800",
  Intermediate: "bg-yellow-100 text-yellow-800",
  Advanced: "bg-red-100 text-red-800",
};

const CATEGORY_COLORS = {
  Logic: "bg-blue-100 text-blue-800",
  Algorithms: "bg-purple-100 text-purple-800",
  OOP: "bg-indigo-100 text-indigo-800",
  "Data Processing": "bg-orange-100 text-orange-800",
};

export function MonacoCodeSamples({ onSelectSample, className = "" }) {
  const handleSampleSelect = (sample) => {
    onSelectSample(sample.code);
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Code Examples</h3>
        <Badge variant="outline" className="text-xs">
          {ENHANCED_CODE_SAMPLES.length} samples
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ENHANCED_CODE_SAMPLES.map((sample) => {
          const Icon = sample.icon;

          return (
            <Card
              key={sample.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
              onClick={() => handleSampleSelect(sample)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base group-hover:text-blue-600 transition-colors">
                        {sample.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {sample.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    className={`text-xs ${
                      DIFFICULTY_COLORS[sample.difficulty]
                    }`}
                  >
                    {sample.difficulty}
                  </Badge>
                  <Badge
                    className={`text-xs ${CATEGORY_COLORS[sample.category]}`}
                  >
                    {sample.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {sample.estimatedTime}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-3">
                  {sample.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSampleSelect(sample);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    Load Code
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(sample.code);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default MonacoCodeSamples;
