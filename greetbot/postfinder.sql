SELECT
	created,
	author,
	pending_payout_value as pending,
	LEN(body) as bodyLength,
	'https://steemit.com' + url as fullURL
FROM 
	Comments (NOLOCK)
WHERE
(
	NOT json_metadata LIKE('%"introduceyourself"%') and
	NOT json_metadata LIKE('%"introducemyself"%') and

	NOT json_metadata LIKE('%"deutsch"%') and
	NOT json_metadata LIKE('%"miprimerconcurso"%') and
	NOT json_metadata LIKE('%"cn"%') and
	NOT json_metadata LIKE('%"kr"%') and
	NOT json_metadata LIKE('%"ru"%') and
	NOT json_metadata LIKE('%"spanish"%') and
	NOT json_metadata LIKE('%"polish"%') and
	NOT json_metadata LIKE('%"myanmar"%') and

	NOT json_metadata LIKE('%"sports"%') and
	NOT json_metadata LIKE('%"meme"%') and
	NOT json_metadata LIKE('%"colorchallenge"%') and
	NOT json_metadata LIKE('%"politics"%') and

	NOT json_metadata LIKE('%"cryptocurrency"%') and
	NOT json_metadata LIKE('%"crypto"%') and
	NOT json_metadata LIKE('%"bitcoin"%') and
	NOT json_metadata LIKE('%"blockchain"%') and

	NOT json_metadata LIKE('%"steemit"%') and

	NOT json_metadata LIKE('%"faith"%') and
	NOT json_metadata LIKE('%"christian-trail"%') and
	NOT json_metadata LIKE('%"christianity"%') and
	NOT json_metadata LIKE('%"religion"%') and
	NOT json_metadata LIKE('%"yeshua"%') and
	NOT json_metadata LIKE('%"god"%') and
	NOT json_metadata LIKE('%"bible"%')
) and
	dirty = 'False' and
	parent_author = '' and
	NOT active_votes LIKE('%"cheetah"%') and
	NOT author IN ('captain1', 'alfa-good', 'market-report', 'anarchistbanjo', 'chnadrakant111', 'sven.keller', 'zahidzzs', 'alidervash', 'steemitstats', 'qyrtina', 'yassinekhoujjan', 'wetten', 'robsonspot', 'satyamnag', 'vertical', 'hursh', 'yuxid', 'markboss', 'trafficmonitor', 'joeyarnoldvn', 'coincheckup', 'bwin', 'bet365', 'tipico') and
	datediff(minute, created, GETDATE()) between 24*60 and 48*60 and
	NOT lower(left(body,4)) in (ltrim('http'),ltrim('<htt'),ltrim('<div'),ltrim('<htm')) and
	CONVERT(int,(SELECT MAX(v) FROM (VALUES(log10(ABS(CONVERT(bigint,author_reputation)-1)) - 9),(0)) T(v)) * SIGN(author_reputation) * 9 +25) between 24 and 30 and
	pending_payout_value < 3.0000 and
	LEN(body) > 5000
ORDER BY 
	created
