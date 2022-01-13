// @ts-check
import {BinaryData} from "./binarydata.js"
import {AlgorithmStorage, Filter} from "./algorithmstorage.js"
import {CUBE_DATA_TYPE, CUBIE_TYPE,CUBIE_STYLE, CUBE_FACE} from "./cubeconsts.js"
import {CubeData, CubeError, Cubie} from "./cubedata.js"


/**
* @param {AlgorithmStorage} algorithm 
*/
 function basicSuccesCallBack(algorithm, algId=0, time=0, cycles=0){
    console.log(`Cube was solved in ${Math.round(time)} seconds and ${cycles} cycles. The algorithm is ${algorithm.getMovesAsText(algId)}`);
}

/**
 * @param {CubeError[]} errors 
 */
function basicFailureCallBack(errors){
    console.log("Failed to solve cube for the follwing reasons: ", errors)
}

/**
 * @param {Function} cancelCallBack 
 */
function basicStartCallBack(cancelCallBack){
    console.log("Verification passed, begining to solve...");

}

/**
 * @param {string} text 
 */
function basicUpdateCallBack(text){

}


/**
 * @param {CubeData} cubeData
 */
function solveCube(cubeData, cubeNumber=0, startCallBack=basicStartCallBack, successCallBack=basicSuccesCallBack, failureCallBack=basicFailureCallBack, updateCallBack=basicUpdateCallBack, cyclesPerFrame=100){


    /** 
         * @param {CubeData} cubeData
         * @param {Number} cubeIndex
         */
    function scoreCube(cubeData, cubeIndex){
        if(cubeData == null || cubeIndex < 0 || cubeIndex >= cubeData.getCubeCount() ){
            return 0;
        }

        var cubeScore = 0;
        const FaceSize = cubeSize ** 2;
        // To score the cubes, we are going to count the 
        // Number of sqaures that are touching of the same color 
        // (2 squares touching results in 2 points in this case)
        // TODO improve this metric later
        for(var i = 0; i < FaceSize; i ++){
            var x = i % cubeSize;
            var y = Math.floor(i / cubeSize);

            // Go through each sticker on each side and see how many colors of its own it touches
            // Note that if x or y is out of range, getSticker will return -1
            //debugger;

            for(var side = 0; side < 6; side++){
                var stickerColor = cubeData.getSticker(side, x, y, cubeIndex);
                
                if(stickerColor == cubeData.getSticker(side, x + 1, y, cubeIndex)){
                    cubeScore ++;
                }

                if(stickerColor == cubeData.getSticker(side, x - 1, y, cubeIndex)){
                    cubeScore ++;
                }

                if(stickerColor == cubeData.getSticker(side, x, y + 1, cubeIndex)){
                    cubeScore ++;
                }

                if(stickerColor == cubeData.getSticker(side, x, y - 1, cubeIndex)){
                    cubeScore ++;
                }

            }

        }
        return cubeScore;

    }

    /**
     * @param {number[]}list
     * @param {number[]}indexList
     */
    function sortList(list, indexList=[]){
        // the list is sorted in place, the return value is a map to return the list to the original order
        if(indexList.length != list.length){
            indexList = [];
            for(var i = 0; i < list.length; i++){
                indexList.push(i);
            }
        }

        // bubble sort the list
        var hasSwapped = true;
        var sortedPortion = list.length - 1;

        while(hasSwapped){
            hasSwapped = false;
            
            for(var i = 0; i < sortedPortion; i ++){
                if(list[i] < list[i + 1]){
                    hasSwapped = true;
                    var tmp = list[i];
                    list[i] = list[i + 1];
                    list[i + 1] = tmp;

                    tmp = indexList[i];
                    indexList[i] = indexList[i + 1];
                    indexList[i + 1] = tmp;

                }
            }
            sortedPortion --;
        }

        return indexList;
    }

    function estimateMoves(cubeData, cubeNumber){
        var score = scoreCube(cubeData, cubeNumber);
        if(score == 144){
            // TODO: remove hard coded data
            return 0;
        }
        if(CUBE_SCORE_DB[score]){
            return CUBE_SCORE_DB[score];
        }else{
            return 7;
        }
    }
    
    // Verification:
    var verificationResults = CubeData.verifyCube(cubeData, cubeNumber);

    if(!verificationResults.passed){// The cube failed the test
        failureCallBack(verificationResults.errors);
        return;
    }

    var cancel = false;

    function cancelSolve(){
        cancel = true;
    }

    startCallBack(cancelSolve);

    // This is where if we had a web worker, we would send work over there
    
    console.log(cubeData.getCubeData(0).getArray())
    // fun statistics we are going to watch
    var startTime = performance.now();
    var cycles = 0;
    var frameCycles = 0;
    var cubesChecked = 0;
    const CYCLES_PER_FRAME = cyclesPerFrame;

    // We will start by setting up the data structures we are going to need
    var cubeSize = cubeData.getCubeSize();
    var all1MoveAlgs = new AlgorithmStorage(cubeSize, 1);
    var all1MoveFilters = [];
    all1MoveAlgs.selfIndex();


    var agCount = all1MoveAlgs.getAlgCount();
    for(var i = 0; i < agCount; i ++){
        all1MoveFilters.push(all1MoveAlgs.getFilter(i, CUBE_DATA_TYPE.Surface));
    }

    // Calculate the max score a cube can have without being solved
    var tmpCube = new CubeData(cubeSize, 1, CUBE_DATA_TYPE.Surface);
    all1MoveFilters[0].applyFilter(tmpCube);
    var maximumUnsolvedScore = scoreCube(tmpCube, 0);
    
    var bound = estimateMoves(cubeData, cubeNumber);
    var stack = new CubeStack();
    stack.push(new CubeNode(cubeData, cubeNumber))

    while(!stack.isEmpty()){
        var aCost = search(stack, 0, bound);
        if(aCost == -1){
            var finalAlg = stack.peek().alg;
            var strg = new AlgorithmStorage(cubeSize, finalAlg.length, 1);
            strg.addAlgorithm(finalAlg);
            successCallBack(strg, 0, 0, 0);
            return;
        }else if (aCost == Infinity){
            console.log("Failed")
            failureCallBack([]);
        }else{
            bound = aCost;
        }
    }

    /**
     * 
     * @param {CubeStack} path 
     * @param {Number} curCost 
     * @param {Number} bound 
     */
    function search(path, curCost, bound){
        var node = path.peek();
        var estCostToGoal = curCost + estimateMoves(node.cubeData, node.cubeNumber);

        if(estCostToGoal > bound){
            return estCostToGoal;
        }

        if(estimateMoves(node.cubeData, node.cubeNumber) == 0){
            return -1;
        }

        var least = Infinity;
        var newNodes = generateNextCubes(node);
        for(var i = 0; i < newNodes.length; i++){
            // TODO Check if cube is in current stack
            path.push(newNodes[i]);
            var resCost = search(path, curCost + 1, bound);
            if(resCost == -1){
                return -1;
            }
            if(resCost < least){
                least = resCost;
            }

        }
        return resCost;


    }

    /**
     * 
     * @param {CubeNode} cubeNode 
     */
    function generateNextCubes(cubeNode){
        var cubeCount = all1MoveAlgs.getAlgCount();
        var newCubeData = new CubeData(cubeSize, cubeCount);
        var validCubes = [];

        for(var i = 0; i < cubeCount; i++){
            if(AlgorithmStorage.checkNextMove(cubeSize, cubeNode.alg, i)){
                newCubeData.setCube(cubeNode.cubeData.getCubeData(cubeNode.cubeNumber), i);
                all1MoveFilters[i].applyFilter(newCubeData, i);
                var newNode = new CubeNode(cubeData, i);
                newNode.alg = cubeNode.alg.slice(0);
                newNode.alg.push(i);
                validCubes.push(newNode);
            }
        }
        return validCubes;
    }

    function CubeStack(){
        this.head = null;
        var me = this;

        this.push = function(newNode){
            newNode.next = me.head;
            me.head = newNode;
        }

        /**
         * 
         * @returns {CubeNode}
         */
        this.pop = function(){
            var result = me.head;

            if(me.head != null){
                me.head = me.head.next;
            }
            return result;
        }

        /**
         * 
         * @returns {CubeNode}
         */
        this.peek = function(){
            return me.head;
        }

        this.isEmpty = function(){
            return me.head == null;
        }
    }

    /**
     * 
     * @param {CubeData} cubeData 
     * @param {Number} cubeNumber 
     * @param {CubeNode} next 
     */
    function CubeNode(cubeData, cubeNumber, next=null){
        this.cubeData = cubeData;
        this.cubeNumber = cubeNumber;
        this.alg = [];
        this.next = next;
    }
    
    
}


function generateScoreDB(cubeSize, moveLength){
        /** 
         * @param {CubeData} cubeData
         * @param {Number} cubeIndex
         */
        function scoreCube(cubeData, cubeIndex){
            if(cubeData == null || cubeIndex < 0 || cubeIndex >= cubeData.getCubeCount() ){
                return 0;
            }
    
            var cubeScore = 0;
            const FaceSize = cubeSize ** 2;
            // To score the cubes, we are going to count the 
            // Number of sqaures that are touching of the same color 
            // (2 squares touching results in 2 points in this case)
            // TODO improve this metric later
            for(var i = 0; i < FaceSize; i ++){
                var x = i % cubeSize;
                var y = Math.floor(i / cubeSize);
    
                // Go through each sticker on each side and see how many colors of its own it touches
                // Note that if x or y is out of range, getSticker will return -1
                //debugger;
    
                for(var side = 0; side < 6; side++){
                    var stickerColor = cubeData.getSticker(side, x, y, cubeIndex);
                    
                    if(stickerColor == cubeData.getSticker(side, x + 1, y, cubeIndex)){
                        cubeScore ++;
                    }
    
                    if(stickerColor == cubeData.getSticker(side, x - 1, y, cubeIndex)){
                        cubeScore ++;
                    }
    
                    if(stickerColor == cubeData.getSticker(side, x, y + 1, cubeIndex)){
                        cubeScore ++;
                    }
    
                    if(stickerColor == cubeData.getSticker(side, x, y - 1, cubeIndex)){
                        cubeScore ++;
                    }
    
                }
    
            }
            return cubeScore;
    
        }

        var results = {};

        for(var moveCount = moveLength; moveCount > 0; moveCount--){
            var algData = new AlgorithmStorage(cubeSize, moveCount);
            algData.selfIndex();

            var algCount = algData.getAlgCount();
            for(var algNum = 0; algNum < algCount; algNum ++){
                var cube = new CubeData(cubeSize);
                var filter = algData.getFilter(algNum, cube.getStorageFormat());
                filter.applyFilter(cube);
                var score = scoreCube(cube, 0);
                results[score] = moveCount;
            }
            console.log("Move set for " + moveCount + " done");
        }

        return results;
}
// @ts-ignore
//window.generateScoreDB = generateScoreDB;


const CUBE_SCORE_DB = {
    0: 6, 
    4: 6, 
    6: 6, 
    8: 6, 
    10: 6, 
    12: 6, 
    14: 6, 
    16: 6, 
    18: 6, 
    20: 6, 
    22: 6, 
    24: 5, 
    26: 5, 
    28: 5, 
    30: 5, 
    32: 5, 
    34: 5, 
    36: 5, 
    38: 5, 
    40: 5, 
    42: 5, 
    44: 5, 
    46: 5, 
    48: 4, 
    50: 4, 
    52: 4, 
    54: 4, 
    56: 4, 
    58: 4, 
    60: 4, 
    62: 4, 
    64: 4, 
    66: 4, 
    68: 4, 
    70: 4, 
    72: 3, 
    74: 3, 
    76: 3, 
    78: 4, 
    80: 3, 
    82: 3, 
    84: 4, 
    86: 3, 
    88: 3, 
    90: 3, 
    92: 4,
    94: 3,
    96: 2, 
    98: 3, 
    100: 3, 
    102: 4, 
    104: 2, 
    106: 5, 
    108: 3, 
    112: 5, 
    116: 5, 
    120: 1,
    144: 0}

export {solveCube}