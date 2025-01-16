const average = (data) => {

    if(data.length === 0) return 0;

    return data.reduce((sum, x) => sum + x, 0) / data.length
};

const rule1 = (data, lowerLimit, upperLimit) => data.map(value => (value > upperLimit || value < lowerLimit) ? value : '')

const rule2 = (data, average) => createGroupsOfSize(8)(data)
    .filter(groupsWherePointsAreAllAboveOrBelowTheAverage(average))
    .reduce(addSignalGroupTo, createResultArrayOfLength(data.length))

const rule3 = (data, average, lowerLimit, upperLimit) => createGroupsOfSize(4)(data)
    .filter(groupsWith3OutOf4pointsCloserToALimitThanTheAverage(average, lowerLimit, upperLimit))
    .reduce(addSignalGroupTo, createResultArrayOfLength(data.length))

const createGroupsOfSize = (groupeSize) => (data) => {
    const groups = [];

    for (let i = 0; i <= data.length - groupeSize; i++) {
        groups.push({index: i, elements: data.slice(i, i + groupeSize)});
    }
    return groups;
};

const addSignalGroupTo = (result, {index, elements}) => {

    for (let i = 0; i < elements.length; i++) {
        result[index + i] = elements[i];
    }

    return result
};

const createResultArrayOfLength = length => new Array(length).fill('');

const groupsWherePointsAreAllAboveOrBelowTheAverage = (average) => ({elements}) => {
    let pointsAboveAverage = 0;
    let pointsBelowAverage = 0;
    for (let i = 0; i < elements.length; i++) {
        if(elements[i] > average) {
            pointsAboveAverage++;
        }
        else if(elements[i] < average) {
            pointsBelowAverage++;
        }
    }

    return pointsAboveAverage === elements.length || pointsBelowAverage === elements.length;
};


const groupsWith3OutOf4pointsCloserToALimitThanTheAverage = (average, lowerLimit, upperLimit) => {

    const upperQuarter = (average + upperLimit) / 2
    const lowerQuarter = (average + lowerLimit) / 2

    return ({elements}) => {

        let countCloserToUpperLimit = 0;
        let countCloserToLowerLimit = 0;

        for (let i = 0; i < elements.length; i++) {
            if (elements[i] > upperQuarter) {
                countCloserToUpperLimit++
            } else if (elements[i] < lowerQuarter) {
                countCloserToLowerLimit++
            }
        }

        return countCloserToUpperLimit >= 3 || countCloserToLowerLimit >= 3;
    };
}


const emptyPBC = () => {
    return {
        'Average': [],
        'Lower limit': [],
        'Upper limit': [],
        'Rule 1': [],
        'Rule 2': [],
        'Rule 3': [],
    }
}

const computeOneProcess = (data, baselineRequestedSize) => {

    if(data.length === 0) throw new Error('Data array must not be empty.');

    let result = {}

    const baselineSize = Math.min(baselineRequestedSize, data.length)
    const baseline = data.slice(0, baselineSize);

    const movingRange = [];

    for(let i = 1; i < baseline.length; i++) {
        let currentValue = baseline[i];
        let previousValue = baseline[i - 1];
        movingRange.push(Math.abs(currentValue - previousValue))
    }
    const averageMovingRange = average(movingRange);

    const processAverage = average(baseline);
    result['Average'] = new Array(data.length).fill(processAverage);

    const lowerLimit = result.Average[0] - (3 * averageMovingRange / 1.128);
    result['Lower limit'] = new Array(data.length).fill(lowerLimit);

    const upperLimit = result.Average[0] + (3 * averageMovingRange / 1.128);
    result['Upper limit'] = new Array(data.length).fill(upperLimit);

    result['Rule 1'] = rule1(data, lowerLimit, upperLimit);
    result['Rule 2'] = rule2(data, processAverage);
    result['Rule 3'] = rule3(data, processAverage, lowerLimit, upperLimit);

    return result
}

const transpose = (obj)=> {
    const keys = Object.keys(obj)

    const lengths = keys.map(key => obj[key].length);
    const [firstLen, ...restLens] = lengths;
    const allSameLength = restLens.every(len => len === firstLen);

    if (!allSameLength) {
        throw new Error('All columns must be of same length.');
    }

    const length = obj[keys[0]].length

    const result = [keys]

    for (let i = 0; i < length; i++) {
        const row = keys.map(key => obj[key][i])
        result.push(row)
    }

    return result
}

const prepareDataFromGoogleSheet = (data) => {
    return data.map(x => {
        return x instanceof Array ? x[0] : x;
    }).filter(x => x !== '');
}

const prepareInstructionsFromGoogleSheet = (data) => {
    return data.map(x => {
        return x instanceof Array ? x[0] : x;
    });
}

const mergeProcesses = (process1, process2) => {
    const mergedProcesses = {};

    for (const key in process1) {
        mergedProcesses[key] = process1[key].concat(process2[key]);
    }

    return mergedProcesses;
}

function buildPBC(data, instructions, baselineSize) {
    const processes = [];

    let currentProcess = [];
    for (let i = 0; i < data.length; i++) {
        if (instructions[i] === 'Change limits' && i > 0) {
            processes.push(currentProcess);
            currentProcess = [];
        }
        currentProcess.push(data[i]);
    }
    processes.push(currentProcess);

    return processes
        .map((p) => computeOneProcess(p, baselineSize))
        .reduce(mergeProcesses, emptyPBC());
}

/**
 * Compute a Process Behavior Charts and list detected Signals
 *
 * @param {B2:B100} data The list of data points to include in the PBC
 * @param {C2:C100} instructions [OPTIONAL] Instructions to change the PBC computation. You can use "Change limits" to trigger a new baseline computation.
 * @param {10} baselineSize [OPTIONAL] The number of data points to include in the baseline
 * @return The PBC and detected signals data
 * @customfunction
 */
const PBC = (data, instructions = [], baselineSize = 10) =>  {

    const cleanData = prepareDataFromGoogleSheet(data);
    const cleanInstructions = prepareInstructionsFromGoogleSheet(instructions)

    const globalPBC = buildPBC(cleanData, cleanInstructions, baselineSize);

    return transpose(globalPBC)
}


export {
    PBC,
    computeOneProcess,
    rule1,
    rule2,
    rule3,
    prepareDataFromGoogleSheet,
    transpose
};