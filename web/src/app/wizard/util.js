import { DateTime } from 'luxon'

const DESC = 'Generated by Setup Wizard'

export function getService(value) {
  return {
    name: value.teamName + ' Service',
    description: DESC,
    newIntegrationKeys: [
      {
        type: value.key.value,
        name: value.key.label + ' Integration Key',
      },
    ],
  }
}

export function getEscalationPolicy(value) {
  return {
    name: value.teamName + ' Escalation Policy',
    description: DESC,
    repeat: value.repeat,
  }
}

export function getSchedule(key, value) {
  const s = value[key]

  return {
    name:
      value.teamName +
      (key.includes('primary') ? ' Primary ' : ' Secondary ') +
      'Schedule',
    description: DESC,
    timeZone: s.timeZone,
  }
}

/*
 * Generates the variables for the targets
 * to be used while creating a new schedule
 */
export function getScheduleTargets(key, value) {
  const s = value[key]
  let targets = []
  const fts = s.followTheSunRotation.enable === 'yes'

  // return just the users as schedule targets if rotation type is set to "never"
  if (s.rotation.type === 'never') {
    return s.users.map(id => ({
      target: {
        id,
        type: 'user',
      },
      rules: [{}], // always active
    }))
  }

  // reusable target fn for rotation targets (normal/follow the sun)
  const type = s.rotation.type
  const duration =
    type === 'daily' ? { day: 1 } : type === 'weekly' ? { week: 1 } : null

  const target = isFTS => {
    let tzText = isFTS ? s.followTheSunRotation.timeZone : s.timeZone
    if (isFTS && s.followTheSunRotation.timeZone === s.timeZone) {
      tzText = s.followTheSunRotation.timeZone + ' FTS'
    }

    let name =
      value.teamName +
      (key.includes('primary') ? ' Primary ' : ' Secondary ') +
      tzText +
      ' Rotation'

    return {
      name: name.replace(/\//g, '-'),
      description: DESC,
      timeZone: isFTS ? s.followTheSunRotation.timeZone : s.timeZone,
      start: DateTime.fromISO(s.rotation.startDate)
        .minus(duration)
        .toISO(),
      type: s.rotation.type,
      userIDs: isFTS ? s.followTheSunRotation.users : s.users,
    }
  }

  // add first rotation
  targets.push({
    newRotation: target(false),
    rules: fts ? [{ start: '09:00', end: '21:00' }] : [{}],
  })

  // push a second rotation for "follow the sun", if enabled
  if (fts) {
    targets.push({
      newRotation: target(true),
      rules: [{ start: '21:00', end: '09:00' }],
    })
  }

  return targets
}
