// @ts-check
/*
    class BinaryData
    ---------------------
    - dataArray:Uint8Array
    - elementBitLength:int
    - elementCount:int
    - dataFlag:int          // not utilized by the object but useful for tagging data types
    ----------------------
    BinaryData(maxElementSize:int, data:array, elementCount:int):BinaryData
    getData(element:int):int
    setData(element:int, info:int):bool
    getMaxElementSize():int
    getArray(startElement:int, endElement:int):array[int]
    setArray(startElement:int, data:array[int]:bool
    getBitLength():int
    getElementCount():int
    getDataFlag():int
    setDataFlag(flag:int):bool
	
*/

export function BinaryData(maxElementSize = 1, data = [0], elementCount = 1, dataFlag = -1) {
    // Returns an obect used for storing binary data
    // This only can store unsigned integers inside.

    this.setData = function (elementIndex = 0, value = 0) {
        // Sets an element in the array, returns true for success, false for failure

        // Check if info is in an invalid range
        if (value > maxElementSize || value % 1 != 0 || typeof (value) != "number") {
            throw "Error: Could not set data, given value too large or was not a positive integer. Value recived: " + value;
        }

        // Check if elementIndex is in range
        if (elementIndex >= elementCount) {
            throw "Error: Could not set binary data, Element index out of range or invalid. Data recived: " + value;
        }

        var arrayId = Math.floor(elementIndex / MAX_ARRAY_SIZE);
        var indexInArray = elementIndex % MAX_ARRAY_SIZE;
        dataArrays[arrayId][indexInArray] = value;
        return true;
    }

    this.getData = function (elementIndex = 0) {
        if (elementIndex >= elementCount || elementIndex < 0) {
            throw "Error, cannot access elements outside of array. Expected Range: 0 - " + (elementCount - 1) + " Value requested: " + elementCount;
        }
        var arrayId = Math.floor(elementIndex / MAX_ARRAY_SIZE);
        var indexInArray = elementIndex % MAX_ARRAY_SIZE;
        var result = dataArrays[arrayId][indexInArray];

        return result;
    }

    this.getMaxElementSize = function () {
        return maxElementSize;
    }

    this.getElementCount = function () {
        return elementCount;
    }

    this.getArray = function (startElementIndex = 0, endElementIndex = elementCount - 1) {
        // Gets a list of items out of the data, can be reversed
        // Defaults to whole array
        var result = [];
        // Check if we are in bounds of the array
        if (startElementIndex < 0 || endElementIndex < 0 || startElementIndex >= elementCount || endElementIndex >= elementCount) {
            throw "Error, cannot access elements outside of array Expected Range: 0 - " + (elementCount - 1) + " Values requested: " + startElementIndex + " - " + endElementIndex;
        }
        // Check if it is reversed
        if (endElementIndex < startElementIndex) {
            for (var i = endElementIndex; i <= startElementIndex; i++) {
                result.push(this.getData(i));
            }
        } else {
            for (var i = startElementIndex; i <= endElementIndex; i++) {
                result.push(this.getData(i));
            }
        }

        return result;

    }

    this.setArray = function (startElementIndex = 0, info = [0]) {
        //Sets an array of data starting with startElement
        if (startElementIndex < 0 || startElementIndex + info.length > elementCount) {
            throw "Error, cannot set elements outside of array Expected Range: 0 - " + (elementCount - 1) + " Values sent: " + startElementIndex + " - " + (startElementIndex + info.length);
        }
        var passed = true;
        for (var i = 0; i < info.length; i++) {
            passed = this.setData(startElementIndex + i, info[i]);
            if (!passed) {
                break;
            }
        }
        return passed;

    }

    this.getDataFlag = function () {
        return dataFlag;
    }

    this.setDataFlag = function (flag = -1) {
        dataFlag = flag;
        return true;
    }

    this.getBinaryData = function () {
        // Returns the binary data stored within the function
        // Use for debugging purposes
        return dataArrays.slice(0);
    }

    var arrayType = 0;

    const ARRAY_TYPE = {
        U8:0,
        U16: 1,
        U32: 2
    }
    /**@type {ArrayBuffer[]} */
    var dataArrays = [];
    const MAX_ARRAY_SIZE = 1024;

    if(maxElementSize < 2 ** 8){
        arrayType = ARRAY_TYPE.U8;
        maxElementSize = 2 ** 8 - 1;
    } else if (maxElementSize < 2 ** 16){
        arrayType = ARRAY_TYPE.U16;
        maxElementSize = 2 ** 16 - 1;
    } else {
        arrayType = ARRAY_TYPE.U32;
        maxElementSize = 2 ** 32 - 1;
    }

    // Verify the number of elements given in elementCount is enough to hold the data, if not, take up more more data
    if (data.length > elementCount) {
        elementCount = data.length;
    }

    // If the elementCount came out to be 1 (due to empty array and elementCount being set to 0), set it to 1
    if (elementCount == 0) {
        elementCount = 1;
    }

    // create our data array based on the byte count calcualated
    for (var i = 0; i < elementCount; i += MAX_ARRAY_SIZE) {
        // Create an array of arrays to keep the data, that way it does not have to be one continous block.
        switch (arrayType){
            case ARRAY_TYPE.U8: {
                
                dataArrays.push(new Uint8Array(Math.min(MAX_ARRAY_SIZE, elementCount - i)));
                break;
            }
            case ARRAY_TYPE.U16: {
                
                dataArrays.push(new Uint8Array(Math.min(MAX_ARRAY_SIZE, elementCount - i)));
                break;
            }
            case ARRAY_TYPE.U32: {
                
                dataArrays.push(new Uint8Array(Math.min(MAX_ARRAY_SIZE, elementCount - i)));
                break;
            }
        }
    }
    //dataArray = new Uint8Array(byteCount);

    // fill the array with data
    for (var i = 0; i < data.length; i++) {
        this.setData(i, data[i]);
    }



}