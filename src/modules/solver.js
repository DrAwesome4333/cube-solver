// @ts-check
import {BinaryData} from "./binarydata.js"
import {AlgorithmStorage, Filter} from "./algorithmstorage.js"
import {CUBE_DATA_TYPE, CUBIE_TYPE,CUBIE_STYLE, CUBE_FACE} from "./cubeconsts.js"
import {CubeData, CubeError, Cubie} from "./cubedata.js"


/**
* @param {AlgorithmStorage} algorithm 
*/
 function basicSuccesCallBack(algorithm, algId=0, time=0, cubesVisited=0){
    console.log(`Cube was solved in ${Math.round(time)} seconds and visited ${cubesVisited} cubes along the way. The algorithm is ${algorithm.getMovesAsText(algId)}`);
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

    
    var startData = new CubeData(cubeSize, 1, CUBE_DATA_TYPE.Piece, cubeData.getCubeData(cubeNumber));

    var cubeScore = scoreCube(startData, cubeNumber);

    console.log("Starting score:", cubeScore);
    
    console.log(startData.getCubeData(0).getArray());


    // fun statistics we are going to watch
    var startTime = performance.now();
    var cycles = 0;
    var cubesChecked = 0;
    const CYCLES_PER_FRAME = cyclesPerFrame;

    // We will start by setting up the data structures we are going to need
    var cubeSize = cubeData.getCubeSize();
    var all1MoveAlgs = new AlgorithmStorage(cubeSize, 1);
    /**@type {Filter[]} */
    var all1MoveFilters = [];
    all1MoveAlgs.selfIndex();


    var agCount = all1MoveAlgs.getAlgCount();
    for(var i = 0; i < agCount; i ++){
        all1MoveFilters.push(all1MoveAlgs.getFilter(i, CUBE_DATA_TYPE.Piece));
    }
    
    var bound = estimateMoves(startData, 0);
    var stack = new CubeStack();
    stack.push(new CubeNode(startData, 0))

    while(!stack.isEmpty()){
        var aCost = search(stack, 0, bound);
        if(aCost == -1){
            var finalAlg = stack.peek().alg;
            var strg = new AlgorithmStorage(cubeSize, finalAlg.length, 1);
            strg.addAlgorithm(finalAlg);
            successCallBack(strg, 0, Math.ceil((performance.now() - startTime)/1000), cubesChecked);
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
        var newNodes = generateNextCubes(node, path);
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
            path.pop();

        }
        
        var tempStg = new AlgorithmStorage(cubeSize, node.alg.length, 1);
        tempStg.addAlgorithm(node.alg);
        updateCallBack("Current Best Alg: " + tempStg.getMovesAsText(0) + 
        "<br>Cubes Visited: " + cubesChecked + 
        "<br>Time elapsed: " + Math.ceil((performance.now() - startTime)/1000) + " seconds");
        return resCost;


    }

    /**
     * 
     * @param {CubeNode} cubeNode 
     */
    function generateNextCubes(cubeNode, path){
        var cubeCount = all1MoveAlgs.getAlgCount();
        var newCubeData = new CubeData(cubeSize, cubeCount, CUBE_DATA_TYPE.Piece);
        var validCubes = [];

        for(var i = 0; i < cubeCount; i++){
            if(AlgorithmStorage.checkNextMove(cubeSize, cubeNode.alg, i)){
                newCubeData.setCube(cubeNode.cubeData.getCubeData(cubeNode.cubeNumber), i);
                all1MoveFilters[i].applyFilter(newCubeData, i);

                if(path.isInStack(newCubeData.getCubeDataAsString(i))){
                    continue;
                }

                var newNode = new CubeNode(newCubeData, i);
                newNode.alg = cubeNode.alg.slice(0);
                newNode.alg.push(i);
                newNode.estimate = estimateMoves(newCubeData, i);
                validCubes.push(newNode);
                cubesChecked ++;
            }
        }

        // Sort the list of cubes to prioratize better looking ones first
        for(var i = 0; i < validCubes.length; i++){
            var hasSwapped = false;
            for(var j = 1; j < validCubes.length - i; j++){
                if(validCubes[j - 1].estimate > validCubes[j].estimate){
                    hasSwapped = true;
                    var temp = validCubes[j];
                    validCubes[j] = validCubes[j - 1];
                    validCubes[j - 1] = temp;
                }
            }
            if(!hasSwapped){
                break;
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

        this.pop = function(){
            var oldHead = me.head;
            if(me.head != null){
                me.head = me.head.next;
            }
            // Trying to find out why the memory usage sky rockets.
            oldHead.next = null;
        }

        this.isInStack = function(data){
            var curr = me.head;
            while(curr != null){
                if(curr.cubeData.getCubeDataAsString(curr.cubeNumber) == data){
                    return true;
                }
                curr = curr.next;
            }
            return false;
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
        this.estimate = 0;
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