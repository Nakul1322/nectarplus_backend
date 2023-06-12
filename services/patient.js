const { User, Appointment, Patient } = require('../models/index');
const { constants } = require("../utils/constant")

const patientList = async (condition, sortCondition, offset, limit, searchQuery, isExport) => {
    try {
        const facetObject = {
            count: [{ $count: 'total' }],
            data: [
                { $sort: sortCondition },
            ]
        };
        if (!isExport) {
            facetObject.data.push({ $skip: offset });
            facetObject.data.push({ $limit: limit })
        }
        const data = await User.model.aggregate([
            {
                $lookup: {
                    from: 'patients',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'patient'
                }
            },
            {
                $unwind: {
                    path: '$patient',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    age: {
                        $floor: {
                            $divide: [
                                {
                                    $subtract: [
                                        new Date(),
                                        "$patient.dob"
                                    ]
                                },
                                1000 * 60 * 60 * 24 * 365
                            ]
                        }
                    }
                }
            },
            { $match: condition },
            { $match: searchQuery },
            {
                $project: {
                    '_id': 1,
                    'fullName': { $ifNull: [`$fullName`, constants.NA] },
                    'age': { $ifNull: [`$age`, constants.NA] },
                    'profilePic': { $ifNull: [`$patient.profilePic`, constants.NA] },
                    'gender': { $ifNull: [`$patient.gender`, constants.NA] },
                    'bloodGroup': { $ifNull: [`$patient.bloodGroup`, constants.NA] },
                    'phone': { $ifNull: [`$phone`, constants.NA] },
                    'address': { $ifNull: [`$patient.address`, constants.NA] },
                    'email': { $ifNull: [`$patient.email`, constants.NA] },
                    'dob': { $ifNull: [`$patient.dob`, constants.NA] },
                    'createdAt': { $ifNull: [`$createdAt`, constants.NA] },  
                    'lowerName': { $toLower: "$fullName" }              
                }
            },
            {
                $facet: facetObject
            },
            {
                $addFields: {
                    count: {
                        $cond: {
                            if: { $eq: ['$count', []] },
                            then: 0,
                            else: {
                                $cond: {
                                    if: { $eq: ['$data', []] },
                                    then: 0,
                                    else: { $arrayElemAt: ['$count.total', 0] }
                                }
                            }
                        }
                    }
                }
            }
        ]);
        return data[0];
    } catch (err) {
        console.log(err);
        return false;
    }
};

const getPatientList = async (condition, sortCondition, offset, limit, searchQuery) => {
    try {
        const data = await Appointment.model.aggregate([
            { $match: condition },
            {
            $lookup: {
                from: 'patients',
                localField: 'patientId',
                foreignField: '_id',
                as: 'patient'
        }
        },
        {
            $unwind: {
            path: '$patient',
            preserveNullAndEmptyArrays: false
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'patient.userId',
                foreignField: '_id',
                as: 'user'
        }
        },
        {
            $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: false
            }
        },

            {
                $addFields: {
                  firstLetter: {
                    $substr: [
                      { $substrCP: [{ $toUpper: "$user.fullName"}, 0, 1] },
                      0,
                      1
                    ]
                  }
                }
              },
            {
                $project: {
                    '_id': { $ifNull: [`$patient._id`, constants.NA] },
                    patientName: { $ifNull: [`$user.fullName`, constants.NA] },
                    firstLetter: 1,
                    profilePic: { $ifNull: [`$patient.profilePic`, constants.NA] }
                }
            },
            {
                $group: {
                    _id: "$firstLetter", // group by first letter
                    documents: { $addToSet: { _id: "$_id", firstLetter: "$firstLetter", patientName:  "$patientName", profilePic: "$profilePic" } },
                }
            },
            {
                $facet: {
                    count: [{ $count: 'total' }],
                    data: [
                        { $sort: { "documents.firstLetter": 1, "documents.patientName": -1 } },
                        { $skip: offset },
                        { $limit: limit }
                    ]
                }
            },
            {
                $addFields: {
                    count: {
                        $cond: {
                            if: { $eq: ['$count', []] },
                            then: 0,
                            else: {
                                $cond: {
                                    if: { $eq: ['$data', []] },
                                    then: 0,
                                    else: { $arrayElemAt: ['$count.total', 0] }
                                }
                            }
                        }
                    }
                }
            }
        ]);
        return data[0];
    } catch (err) {
        return false;
    }
};

const appointmentList = async (condition) => {
    try {
        const data = await Appointment.model.aggregate([
            { $match: condition },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'doctorId',
                    foreignField: '_id',
                    as: 'doctor'
                }
            },
            {
                $unwind: {
                    path: '$doctor',
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $lookup: {
                    from: 'patientclinicalrecords',
                    localField: '_id',
                    foreignField: 'appointmentId',
                    as: 'patientClinicalRecord'
                }
            },
            {
                $unwind: {
                    path: '$patientClinicalRecord',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    '_id': 1,
                    'patientName': { $ifNull: [`$user.fullName`, '$patientName', constants.NA] },
                    'doctorName': { $ifNull: [`$doctor.fullName`, constants.NA] },
                    'patientClinicalRecord': { $ifNull: [`$patientClinicalRecord`, constants.NA] },
                    'slot': 1,
                    'phone': 1,
                    'patientPhone': 1,
                    'patientEmail': 1
                }
            },
            {
                $facet: {
                    count: [{ $count: 'total' }],
                    data: [
                        { $sort: { slot: 1 } },
                        { $limit: 10 }
                    ]
                }
            },
            {
                $addFields: {
                    count: {
                        $cond: {
                            if: { $eq: ['$count', []] },
                            then: 0,
                            else: {
                                $cond: {
                                    if: { $eq: ['$data', []] },
                                    then: 0,
                                    else: { $arrayElemAt: ['$count.total', 0] }
                                }
                            }
                        }
                    }
                }
            }
        ]);
        return data[0];
    } catch (err) {
        return false;
    }
};

const getPatientData = async (condition) => {
    try {
        const data = await Patient.model.aggregate([
            { $match: condition },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'statemasters',
                    localField: 'address.state',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            {
                $unwind: {
                    path: '$state',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    '_id': 1,
                    'patientName': { $ifNull: [`$user.fullName`, constants.NA] },
                    'phone': { $ifNull: [`$user.phone`, constants.NA] },
                    'dob': { $ifNull: [`$dob`, constants.NA] },
                    'address': { $ifNull: [`$address`, constants.NA] },
                    'bloodGroup': { $ifNull: [`$bloodGroup`, constants.NA] },
                    'gender': { $ifNull: [`$gender`, constants.NA] },
                    'profilePic': { $ifNull: [`$profilePic`, constants.NA] },
                    'email': { $ifNull: [`$email`, constants.NA] },
                    'languagePreference':{ $ifNull: [`$languagePreference`, constants.NA] },
                    'stateName':{ $ifNull: [`$state.name`, constants.NA] }
                }
            },
        ]);
        return data[0];
    } catch (err) {
        console.log(err);
        return false;
    }
};


const hospitalPatientList = async (condition, sortCondition, offset, limit, searchQuery, isExport) => {
    try {
        const facetObject = {
            count: [{ $count: 'total' }],
            data: [
                { $sort: sortCondition },
            ]
        };
        if (!isExport) {
            facetObject.data.push({ $skip: offset });
            facetObject.data.push({ $limit: limit })
        }
        const data = await Appointment.model.aggregate([
            { $match: condition },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patient'
                }
            },
            {
                $unwind: {
                    path: '$patient',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'patient.userId',
                    foreignField: '_id',
                    as: 'patientUser'
                }
            },
            {
                $unwind: {
                    path: '$patientUser',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    age: {
                        $floor: {
                            $divide: [
                                {
                                    $subtract: [
                                        new Date(),
                                        "$patient.dob"
                                    ]
                                },
                                1000 * 60 * 60 * 24 * 365
                            ]
                        }
                    }
                }
            },        
            { $match: searchQuery },
            {
                $project: {
                    '_id': { $ifNull: [`$patient._id`, constants.NA] },
                    'fullName': { $ifNull: [`$patientUser.fullName`, constants.NA] },
                    'age': { $ifNull: [`$age`, constants.NA] },
                    'profilePic': { $ifNull: [`$patient.profilePic`, constants.NA] },
                    'gender': { $ifNull: [`$patient.gender`, constants.NA] },
                    'bloodGroup': { $ifNull: [`$patient.bloodGroup`, constants.NA] },
                    'phone': { $ifNull: [`$patientUser.phone`, constants.NA] },
                    'email': { $ifNull: [`$patient.email`, constants.NA] },
                    'createdAt': { $ifNull: [`$patient.createdAt`, constants.NA] },  
                    'lowerName': { $toLower: "$patientUser.fullName" }              
                }
            },
            { $group: { _id: "$_id", data: { $push: "$$ROOT" } } },
            { $replaceRoot: { newRoot: { $mergeObjects: "$data" } } },
            {
                $facet: facetObject
            },
            {
                $addFields: {
                    count: {
                        $cond: {
                            if: { $eq: ['$count', []] },
                            then: 0,
                            else: {
                                $cond: {
                                    if: { $eq: ['$data', []] },
                                    then: 0,
                                    else: { $arrayElemAt: ['$count.total', 0] }
                                }
                            }
                        }
                    }
                }
            },
        ]);
        console.log()
        return data[0];
    } catch (err) {
        console.log(err);
        return false;
    }
};

const getEstablishmentId = async (Model, condition) => {
    try {
        const data = await Model.aggregate([
            { $match: condition },
            {
                $lookup: {
                  from: "establishmentmasters",
                  let: { hospitalId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                             $eq: ["$hospitalId", "$$hospitalId"],
                        }
                      }
                    },
                  ],
                  as: "establishmentMaster",
                },
              },
            { $unwind: { path: "$establishmentMaster", preserveNullAndEmptyArrays: true } },
            { $match: { "establishmentMaster.doctorId": { $exists: false } }  },
            { $project: {
                _id: 1,
                establishmentMasterId: `$establishmentMaster._id`
            } }
        ]);
        return data[0];
    } catch (err) {
        console.log(err);
        return false;
    }
};

module.exports = { patientList, getPatientList, appointmentList, getPatientData, hospitalPatientList, getEstablishmentId };
