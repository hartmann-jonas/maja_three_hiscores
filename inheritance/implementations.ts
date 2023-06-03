import { Sorter } from "./interfaces";
const fs = require("fs");
export class DefaultSorter implements Sorter {
  timed_sort(array: number[]): { array: number[]; milliseconds: number } {
    let start = Date.now();
    let temp = this.sort(array);
    let end = Date.now();
    return { array: temp, milliseconds: end - start };
  }
  sort(array: number[]): number[] {
    // TODO: complete the default sort - DONE?
    array.sort((a, b)=> a - b);
    array.reverse()
    return array;
  }
  shuffle(array: number[]): number[] {
    // https://stackoverflow.com/a/2450976
    let currentIndex = array.length;
    let randomIndex: number;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  }
}

export class DefaultSorterTimeLogger extends DefaultSorter {
  override timed_sort(array: number[]): {
    array: number[];
    milliseconds: number;
  } {
    let temp = super.timed_sort(array);
    console.log("Time elapsed: " + temp.milliseconds + "ms")
    return temp;
  }
}

export class BubbleSorter extends DefaultSorterTimeLogger {
  //https://rajat-m.medium.com/implement-5-sorting-algorithms-using-javascript-63c5a917e811
  sort(array: number[]): number[] {
    // TODO: implement bubblesort, check at the link
  for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array.length - i - 1; j++) {
          if (array[j + 1] < array[j]) {
              // ES6 way of swapping array elements
              [array[j + 1], array[j]] = [array[j], array[j + 1]];
          }
      }
  }
  return array;
  }
}

export class QuickSorter extends DefaultSorterTimeLogger {
  //https://rajat-m.medium.com/implement-5-sorting-algorithms-using-javascript-63c5a917e811
  sort(array: number[]): number[] {
    // TODO: implement quicksort, check the link
    function partition(array, start = 0, end = array.length - 1) {
      // Let's choose the pivot to be the array[start] element
      let pivot = array[start];
      let swapIdx = start;
    
      for (let i = start + 1; i <= end; i++) {
          if (array[i] < pivot) {
              swapIdx++;
              // Swap current element with the element at the new pivot index
              [array[i], array[swapIdx]] = [array[swapIdx], array[i]];
          }
      }
    
      // Swap the pivot element with the element at the pivotIndex index
      [array[swapIdx], array[start]] = [array[start], array[swapIdx]];
    
      // Return the index of the pivot element after swapping
      return swapIdx;
    }

    function quickSort(array, left = 0, right = array.length - 1) {
      //let left = 0
      //let right = array.length - 1
      // Base case is that the left and right pointers don't overlap, after which we'll be left with an array of 1 item
      if (left < right) {
          let pivotIndex = partition(array, left, right);

          // For left subarray, which is everything to the left of the pivot element
          quickSort(array, left, pivotIndex - 1);

          // For the right sub array, which is everything to the right of the pivot element
          quickSort(array, pivotIndex + 1, right);
      }
      // Return the array, when it's of length 1 i.e, left === right
    }
    quickSort(array)
    return array;
  }
}

// this sorter does the parent sort and also dumps the result to file
export class QuickSorterTimeFileDumper extends QuickSorter {
  override timed_sort(array: number[]): {
    array: number[];
    milliseconds: number;
  } {
    let temp = super.timed_sort(array);
    // TODO: log the time to a file. use "./log.txt" as filename
    // make sure that you are logging a string and not a number
    // https://nodejs.dev/en/learn/writing-files-with-nodejs/
    // https://stackoverflow.com/questions/10599148/how-do-i-get-the-current-time-only-in-javascript/74413189#74413189
    const content = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' It took ' + temp.milliseconds.toString() + 'ms to sort the Array\r\n'
    if (content) {
      fs.appendFile('./log.txt', content, err => {
        if (err) {
          console.error(err);
        } else {
          console.log("Logfile written successfully")
        }
      });
    }
    return temp;
  }
}
