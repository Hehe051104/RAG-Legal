"""
新数据处理脚本：解析北大法宝.doc文件，构建JSON记录和向量数据库
支持：法律原文、司法解释、案例（民事/刑事/行政/执行/国家赔偿）
"""
import os
import sys
import json
import re
import struct
import time
from pathlib import Path
from collections import defaultdict

# 添加项目路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

import olefile
import numpy as np
from config import PROJECT_ROOT, DATA_DIR


# ============================================================
# 第一部分：.doc 文本提取器
# ============================================================

class DocTextExtractor:
    """从OLE2格式的.doc文件中提取纯文本"""

    @staticmethod
    def extract(file_path: str) -> str:
        """提取.doc文件的全部文本内容"""
        try:
            ole = olefile.OleFileIO(file_path)
            wd = ole.openstream('WordDocument').read()

            # 解析FIB获取文本偏移量
            fcMin = struct.unpack('<I', wd[0x18:0x1c])[0]
            fcMac = struct.unpack('<I', wd[0x1c:0x20])[0]

            # 提取文本（UTF-16LE编码）
            text = wd[fcMin:fcMac].decode('utf-16le', errors='ignore')

            # 清理HYPERLINK字段
            text = re.sub(r'\x13[^\x14]*\x14', '', text)
            # 清理控制字符
            text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x15]', '', text)
            # 合并多余空格
            text = re.sub(r'[ \t]+', ' ', text)

            ole.close()
            return text
        except Exception as e:
            print(f"  [错误] 无法解析 {file_path}: {e}")
            return ""


# ============================================================
# 第二部分：元数据解析器
# ============================================================

class MetaParser:
    """解析文档开头的元数据字段"""

    # 案例元数据字段列表（用于定位元数据区域）
    CASE_META_FIELDS = ['案由', '案\s*号', '文书类型', '公开类型', '审理法院',
                        '审结日期', '案件类型', '审理程序', '权责关键词',
                        '来源', '刑罚', '指控罪名', '判定罪名']

    # 法律/解释元数据字段列表
    LAW_META_FIELDS = ['制定机关', '发文字号', '公布日期', '施行日期',
                       '时效性', '效力位阶', '法规类别', '专题分类']

    @staticmethod
    def clean_text(text: str) -> str:
        """清理HYPERLINK残留和多余空白"""
        text = re.sub(r'https?://\S+', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @staticmethod
    def split_case_meta_body(text: str):
        """案例文件：用 // 分隔元数据和正文"""
        # 统一换行符
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        idx = text.find('//')
        if idx > 0:
            return text[:idx].strip(), text[idx + 2:].strip()
        # 如果没有//，尝试用【关键词】作为正文开始标记
        kw_match = re.search(r'【关键词】', text)
        if kw_match:
            return text[:kw_match.start()].strip(), text[kw_match.start():].strip()
        return text[:2000].strip(), ""

    @staticmethod
    def split_law_meta_body(text: str):
        """法律/解释文件：元数据在开头，正文从第一条/目录开始，//在末尾

        结构: [元数据] [历史沿革] [目录] [正文: 第X条...] [//] [北大法宝信息]
        """
        # 统一换行符：\r\n → \n, \r → \n
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        # 找 // 的位置（在末尾）
        slash_idx = text.find('//')

        # 找正文开始位置：第一条 或 第一章
        body_start = None
        # 先找"第一条"
        first_art = re.search(r'第[一二三四五六七八九十百千零]+条', text)
        if first_art:
            # 往前找，看是否有"第一章"之类的章节标题
            pre_text = text[:first_art.start()]
            chapter_match = re.search(r'第[一二三四五六七八九十百千零]+章[　\s]', pre_text)
            if chapter_match:
                body_start = chapter_match.start()
            else:
                body_start = first_art.start()

        if body_start is None:
            # 没找到正文，把整个文本当作元数据
            return text, ""

        # 元数据 = 正文之前的所有内容
        meta_text = text[:body_start].strip()

        # 正文 = 从正文开始到//（如果有的话）
        if slash_idx > 0 and slash_idx > body_start:
            body_text = text[body_start:slash_idx].strip()
        else:
            body_text = text[body_start:].strip()

        return meta_text, body_text

    @staticmethod
    def parse_law_meta(meta_text: str) -> dict:
        """解析法律/司法解释的元数据"""
        fields = {}

        # 统一换行符和冒号
        meta_text = meta_text.replace('\r\n', '\n').replace('\r', '\n')
        meta_text = meta_text.replace('：', ':')

        # 提取标题（第一行）
        lines = meta_text.strip().split('\n')
        title = lines[0].strip() if lines else ""
        title = MetaParser.clean_text(title)
        # 标题应该只是法律名，去掉多余内容
        if '制定机关' in title:
            title = title.split('制定机关')[0].strip()
        fields['title'] = title

        # 正则匹配各字段
        patterns = {
            'issuing_authority': r'制定机关:\s*(.+?)(?:\s*机构沿革|\s*发文字号|\s*公布日期|\s*$)',
            'document_number': r'发文字号:\s*(.+?)(?:\s*公布日期|\s*施行日期|\s*$)',
            'promulgation_date': r'公布日期:\s*(\d{4}\.\d{2}\.\d{2})',
            'effective_date': r'施行日期:\s*(\d{4}\.\d{2}\.\d{2})',
            'timeliness': r'时效性:\s*(.+?)(?:\s*效力位阶|\s*$)',
            'authority_level': r'效力位阶:\s*(.+?)(?:\s*法规类别|\s*$)',
            'category': r'法规类别:\s*(.+?)(?:\s*专题分类|\s*$)',
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, meta_text)
            if match:
                val = MetaParser.clean_text(match.group(1))
                if val:
                    fields[key] = val

        return fields

    @staticmethod
    def parse_case_meta(meta_text: str) -> dict:
        """解析案例的元数据"""
        fields = {}

        # 统一换行符和冒号
        meta_text = meta_text.replace('\r\n', '\n').replace('\r', '\n')
        # 统一全角冒号为半角
        meta_text = meta_text.replace('：', ':')

        # 提取标题（第一行）
        lines = meta_text.strip().split('\n')
        title = lines[0].strip() if lines else ""
        title = MetaParser.clean_text(title)
        fields['title'] = title

        # 案由（可能多个，用换行分隔）
        cause_match = re.search(r'案由:\s*(.+?)(?=案\s*号|文书类型|$)', meta_text, re.DOTALL)
        if cause_match:
            raw_cause = cause_match.group(1).strip()
            raw_cause = re.sub(r'https?://\S+', '', raw_cause)
            # 按多个案由链分割
            causes = []
            parts = re.split(r'(?=(?:刑事|民事|行政|执行|国家赔偿)\s*>)', raw_cause)
            for part in parts:
                part = part.strip()
                if part:
                    part = re.sub(r'案由(释义|注)\s*$', '', part).strip()
                    if part:
                        causes.append(part)
            fields['case_causes'] = causes if causes else [raw_cause]

        # 案号
        num_match = re.search(r'案\s*号:\s*(.+?)(?=文书类型|公开类型|$)', meta_text, re.DOTALL)
        if num_match:
            fields['case_number'] = num_match.group(1).strip()

        # 文书类型
        doc_type_match = re.search(r'文书类型:\s*(.+?)(?=公开类型|审理法院|$)', meta_text, re.DOTALL)
        if doc_type_match:
            fields['document_type'] = MetaParser.clean_text(doc_type_match.group(1))

        # 审理法院
        court_match = re.search(r'审理法院:\s*(.+?)(?=审结日期|案件类型|$)', meta_text, re.DOTALL)
        if court_match:
            fields['court'] = MetaParser.clean_text(court_match.group(1))

        # 审结日期
        date_match = re.search(r'审结日期:\s*(\d{4}\.\d{2}\.\d{2})', meta_text)
        if date_match:
            fields['date'] = date_match.group(1)

        # 案件类型
        case_type_match = re.search(r'案件类型:\s*(.+?)(?=审理程序|权责关键词|$)', meta_text, re.DOTALL)
        if case_type_match:
            fields['case_type'] = MetaParser.clean_text(case_type_match.group(1))

        # 审理程序
        step_match = re.search(r'审理程序:\s*(.+?)(?=权责关键词|来源|$)', meta_text, re.DOTALL)
        if step_match:
            fields['trial_step'] = MetaParser.clean_text(step_match.group(1))

        # 权责关键词
        kw_match = re.search(r'权责关键词:\s*(.+?)(?=来源|刑罚|指控罪名|$)', meta_text, re.DOTALL)
        if kw_match:
            raw_kw = re.sub(r'https?://\S+', '', kw_match.group(1))
            raw_kw = re.sub(r'\s+', ' ', raw_kw).strip()
            fields['keywords'] = raw_kw

        # 来源
        src_match = re.search(r'来源:\s*(.+?)(?=刑罚|指控罪名|判定罪名|$)', meta_text)
        if src_match:
            fields['source_info'] = MetaParser.clean_text(src_match.group(1))

        # 刑罚
        punish_match = re.search(r'刑罚:\s*(.+?)(?=指控罪名|判定罪名|$)', meta_text)
        if punish_match:
            fields['criminal_punish'] = punish_match.group(1).strip()

        # 指控罪名
        acc_match = re.search(r'指控罪名:\s*(.+?)(?=判定罪名|$)', meta_text)
        if acc_match:
            fields['accused_crime'] = MetaParser.clean_text(acc_match.group(1))

        # 判定罪名
        conv_match = re.search(r'判定罪名:\s*(.+?)(?=$)', meta_text)
        if conv_match:
            fields['convicted_crime'] = MetaParser.clean_text(conv_match.group(1))

        return fields


# ============================================================
# 第三部分：正文内容解析器
# ============================================================

class ContentParser:
    """解析正文内容，提取各段落"""

    @staticmethod
    def parse_case_body(body_text: str) -> dict:
        """解析案例正文，提取关键词、案情、理由、要旨、索引"""
        sections = {}

        patterns = {
            'keywords_desc': r'【关键词】\s*(.+?)(?=【基本案情】|$)',
            'basic_facts': r'【基本案情】\s*(.+?)(?=【裁判理由】|$)',
            'reasoning': r'【裁判理由】\s*(.+?)(?=【裁判要旨】|$)',
            'summary': r'【裁判要旨】\s*(.+?)(?=【关联索引】|$)',
            'references': r'【关联索引】\s*(.+?)(?:©|北大法宝|法宝引证码|$)',
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, body_text, re.DOTALL)
            if match:
                text = match.group(1).strip()
                text = re.sub(r'\s+', ' ', text).strip()
                sections[key] = text

        return sections

    @staticmethod
    def parse_law_body(body_text: str) -> list:
        """解析法律/司法解释正文，按条拆分，同时提取章节层级"""
        articles = []

        # 章节正则
        re_book = re.compile(r'(第[一二三四五六七八九十百千零]+编)\s+(.+?)(?=\s*第|$)')
        re_subbook = re.compile(r'(第[一二三四五六七八九十百千零]+分编)\s+(.+?)(?=\s*第|$)')
        re_chapter = re.compile(r'(第[一二三四五六七八九十百千零]+章)\s+(.+?)(?=\s*第|$)')
        re_section = re.compile(r'(第[一二三四五六七八九十百千零]+节)\s+(.+?)(?=\s*第|$)')

        # 当前层级
        current_book = ""
        current_subbook = ""
        current_chapter = ""
        current_section = ""

        # 拆分正文：先按"第X章/编/节"拆分，再按"第X条"拆分
        # 统一处理：用正则找所有标记位置
        markers = []
        for m in re.finditer(r'(第[一二三四五六七八九十百千零]+(?:编|分编|章|节|条)(?:之[一二三四五六七八九十]+)?)', body_text):
            markers.append((m.start(), m.end(), m.group(1)))

        current_article = None
        current_content = []
        last_pos = 0

        for start, end, marker_text in markers:
            # 提取标记前的文本
            if start > last_pos:
                text_before = body_text[last_pos:start].strip()
                if text_before and current_article:
                    current_content.append(text_before)

            # 判断标记类型
            if re.match(r'第.+编$', marker_text) and '分编' not in marker_text:
                current_book = marker_text
                current_subbook = ""
                current_chapter = ""
                current_section = ""
                # 保存当前条
                if current_article and current_content:
                    content = '\n'.join(current_content).strip()
                    if len(content) > 10:
                        articles.append({
                            'article_number': current_article,
                            'content': content,
                            'hierarchy': {'book': current_book, 'subbook': current_subbook, 'chapter': current_chapter, 'section': current_section}
                        })
                    current_article = None
                    current_content = []
            elif '分编' in marker_text:
                current_subbook = marker_text
                current_chapter = ""
                current_section = ""
            elif re.match(r'第.+章$', marker_text):
                current_chapter = marker_text
                current_section = ""
            elif re.match(r'第.+节$', marker_text):
                current_section = marker_text
            elif re.match(r'第.+条', marker_text):
                # 保存上一条
                if current_article and current_content:
                    content = '\n'.join(current_content).strip()
                    if len(content) > 10:
                        articles.append({
                            'article_number': current_article,
                            'content': content,
                            'hierarchy': {'book': current_book, 'subbook': current_subbook, 'chapter': current_chapter, 'section': current_section}
                        })
                current_article = marker_text
                current_content = []

            last_pos = end

        # 处理最后一个标记后的内容
        if last_pos < len(body_text):
            remaining = body_text[last_pos:].strip()
            if remaining and current_article:
                current_content.append(remaining)

        # 保存最后一条
        if current_article and current_content:
            content = '\n'.join(current_content).strip()
            if len(content) > 10:
                articles.append({
                    'article_number': current_article,
                    'content': content,
                    'hierarchy': {'book': current_book, 'subbook': current_subbook, 'chapter': current_chapter, 'section': current_section}
                })

        return articles


# ============================================================
# 第四部分：关联索引解析器（构建图关系的核心）
# ============================================================

class RelationParser:
    """解析关联索引，构建文档间的引用关系"""

    @staticmethod
    def parse_references(ref_text: str) -> dict:
        """解析关联索引文本，提取法条引用、解释引用、案例引用"""
        relations = {
            'laws': [],
            'interpretations': [],
            'related_cases': []
        }

        if not ref_text:
            return relations

        # 先用《》分割，提取所有法律/解释引用
        # 匹配模式：《法律名》（文号）第X条、第Y条
        # 文号是可选的，例如：（法释〔2013〕18号）
        law_pattern = r'《([^》]+)》(?:\s*（[^）]+）)?\s*((?:第[一二三四五六七八九十百千零\d]+条(?:[、,]\s*第[一二三四五六七八九十百千零\d]+条)*))'
        for match in re.finditer(law_pattern, ref_text):
            law_name = match.group(1).strip()
            articles_text = match.group(2).strip()

            # 判断是法律还是解释
            is_interp = any(kw in law_name for kw in ['解释', '规定', '批复', '意见', '通知'])

            # 按顿号分割多个条号引用
            art_parts = re.split(r'[、,]\s*(?=第)', articles_text)
            for art in art_parts:
                art = art.strip()
                if art and '第' in art:
                    entry = {
                        'name': law_name,
                        'article': art,
                        'ref_text': match.group(0)
                    }
                    if is_interp:
                        relations['interpretations'].append(entry)
                    else:
                        relations['laws'].append(entry)

        # 提取案例引用：一审：XX法院（年份）...号
        case_pattern = r'(一审|二审|再审|执行异议|执行复议|执行监督|委赔|提审|申诉|自赔|其他审理程序)[：:]\s*([^　\n]+?)(?=\s*(?:一审|二审|再审|执行异议|执行复议|执行监督|委赔|提审|申诉|自赔|其他审理程序)[：:]|$)'
        for match in re.finditer(case_pattern, ref_text):
            step = match.group(1)
            detail = match.group(2).strip()
            # 提取案号
            case_num_match = re.search(r'[（(]\d{4}[）)].*?号', detail)
            case_number = case_num_match.group(0) if case_num_match else ""
            # 提取法院
            court_match = re.search(r'(.+?人民法院|.+?法院|.+?仲裁委员会)', detail)
            court = court_match.group(1) if court_match else ""
            # 提取日期
            date_match = re.search(r'(\d{4}年\d{1,2}月\d{1,2}日)', detail)
            date = date_match.group(1) if date_match else ""

            relations['related_cases'].append({
                'step': step,
                'case_number': case_number,
                'court': court,
                'date': date,
                'ref_text': match.group(0)
            })

        return relations


# ============================================================
# 第五部分：文档记录构建器
# ============================================================

class RecordBuilder:
    """构建最终的JSON记录"""

    @staticmethod
    def build_case_record(file_path: str, folder_name: str) -> dict:
        """构建案例记录"""
        text = DocTextExtractor.extract(file_path)
        if not text:
            return None

        meta_text, body_text = MetaParser.split_case_meta_body(text)
        meta = MetaParser.parse_case_meta(meta_text)
        body = ContentParser.parse_case_body(body_text)

        # 文件名作为ID
        file_name = os.path.basename(file_path)
        fbmcli_match = re.search(r'(FBMCLI\.C\.\d+)', file_name)
        doc_id = fbmcli_match.group(1) if fbmcli_match else os.path.splitext(file_name)[0]

        # 解析关联索引
        relations = RelationParser.parse_references(body.get('references', ''))

        # 构建content（用于embedding）
        content_parts = []
        if meta.get('case_causes'):
            content_parts.append(f"【案由】{'；'.join(meta['case_causes'])}")
        if meta.get('case_number'):
            content_parts.append(f"【案号】{meta['case_number']}")
        if meta.get('keywords'):
            content_parts.append(f"【关键词】{meta['keywords']}")
        if body.get('keywords_desc'):
            content_parts.append(f"【法律关键词】{body['keywords_desc']}")
        if body.get('basic_facts'):
            content_parts.append(f"【基本案情】{body['basic_facts']}")
        if body.get('reasoning'):
            content_parts.append(f"【裁判理由】{body['reasoning']}")
        if body.get('summary'):
            content_parts.append(f"【裁判要旨】{body['summary']}")
        # 嵌入法条引用
        if relations['laws']:
            law_refs = []
            for ref in relations['laws']:
                law_refs.append(f"《{ref['name']}》{ref['article']}")
            content_parts.append(f"【适用法条】{'；'.join(law_refs)}")

        content = '\n'.join(content_parts)

        # 构建hierarchy
        hierarchy = {'book': '', 'subbook': '', 'chapter': folder_name, 'section': ''}
        if meta.get('case_causes') and meta['case_causes']:
            parts = meta['case_causes'][0].split('>')
            if len(parts) >= 2:
                hierarchy['section'] = parts[1].strip()

        record = {
            'id': f"case_{doc_id}",
            'doc_type': 'case',
            'case_number': meta.get('case_number', ''),
            'case_causes': meta.get('case_causes', []),
            'court': meta.get('court', ''),
            'date': meta.get('date', ''),
            'case_type': meta.get('case_type', ''),
            'trial_step': meta.get('trial_step', ''),
            'document_type': meta.get('document_type', ''),
            'source_info': meta.get('source_info', ''),
            'keywords': meta.get('keywords', ''),
            'criminal_punish': meta.get('criminal_punish', ''),
            'accused_crime': meta.get('accused_crime', ''),
            'convicted_crime': meta.get('convicted_crime', ''),
            'content': content,
            'content_sections': body,
            'source': meta.get('court', folder_name),
            'article_number': meta.get('case_number', doc_id),
            'hierarchy': hierarchy,
            'relations': relations
        }

        return record

    @staticmethod
    def build_law_record(file_path: str) -> list:
        """构建法律原文记录（每条法律条文一条记录）"""
        text = DocTextExtractor.extract(file_path)
        if not text:
            return []

        meta_text, body_text = MetaParser.split_law_meta_body(text)
        meta = MetaParser.parse_law_meta(meta_text)

        if not body_text:
            print(f"  [警告] 未找到正文: {os.path.basename(file_path)}")
            return []

        # 文件名提取唯一ID
        file_name = os.path.basename(file_path)
        fbmcli_match = re.search(r'(FBMCLI\.\d+\.\d+)', file_name)
        doc_prefix = fbmcli_match.group(1) if fbmcli_match else os.path.splitext(file_name)[0]

        # 按条拆分
        articles = ContentParser.parse_law_body(body_text)

        records = []
        for art in articles:
            law_name = meta.get('title', '')
            law_name_clean = re.sub(r'[（(]\d{4}.*?[）)]', '', law_name).strip()

            content = f"《{law_name_clean}》{art['article_number']}\n{art['content']}"

            # 使用从正文中提取的hierarchy
            hierarchy = art.get('hierarchy', {'book': '', 'subbook': '', 'chapter': '', 'section': ''})

            record = {
                'id': f"law_{doc_prefix}_{art['article_number']}",
                'doc_type': 'law',
                'law_name': law_name_clean,
                'full_name': law_name,
                'issuing_authority': meta.get('issuing_authority', ''),
                'document_number': meta.get('document_number', ''),
                'promulgation_date': meta.get('promulgation_date', ''),
                'effective_date': meta.get('effective_date', ''),
                'timeliness': meta.get('timeliness', ''),
                'authority_level': meta.get('authority_level', ''),
                'category': meta.get('category', ''),
                'article_number': art['article_number'],
                'content': content,
                'source': law_name_clean,
                'hierarchy': hierarchy,
                'relations': {'laws': [], 'interpretations': [], 'related_cases': []}
            }
            records.append(record)

        return records

    @staticmethod
    def build_interpretation_record(file_path: str) -> list:
        """构建司法解释记录（每条解释条文一条记录）"""
        text = DocTextExtractor.extract(file_path)
        if not text:
            return []

        meta_text, body_text = MetaParser.split_law_meta_body(text)
        meta = MetaParser.parse_law_meta(meta_text)

        if not body_text:
            print(f"  [WARN] No body: {os.path.basename(file_path)}")
            return []

        file_name = os.path.basename(file_path)
        fbmcli_match = re.search(r'(FBMCLI\.\d+\.\d+)', file_name)
        doc_prefix = fbmcli_match.group(1) if fbmcli_match else os.path.splitext(file_name)[0]

        articles = ContentParser.parse_law_body(body_text)

        records = []
        for art in articles:
            interp_name = meta.get('title', '')
            interp_name_clean = re.sub(r'[（(]\d{4}.*?[）)]', '', interp_name).strip()

            content = f"《{interp_name_clean}》{art['article_number']}\n{art['content']}"

            # 使用从正文中提取的hierarchy
            hierarchy = art.get('hierarchy', {'book': '', 'subbook': '', 'chapter': '', 'section': ''})

            record = {
                'id': f"interp_{doc_prefix}_{art['article_number']}",
                'doc_type': 'interpretation',
                'interpretation_name': interp_name_clean,
                'full_name': interp_name,
                'issuing_authority': meta.get('issuing_authority', ''),
                'document_number': meta.get('document_number', ''),
                'promulgation_date': meta.get('promulgation_date', ''),
                'effective_date': meta.get('effective_date', ''),
                'timeliness': meta.get('timeliness', ''),
                'authority_level': meta.get('authority_level', ''),
                'category': meta.get('category', ''),
                'article_number': art['article_number'],
                'content': content,
                'source': interp_name_clean,
                'hierarchy': hierarchy,
                'relations': {'laws': [], 'interpretations': [], 'related_cases': []}
            }
            records.append(record)

        return records


# ============================================================
# 第六部分：主流程
# ============================================================

def process_all_data():
    """处理所有数据，生成JSON文件"""
    print("=" * 60)
    print("开始处理北大法宝数据")
    print("=" * 60)

    all_records = []

    # --- 处理法律原文 ---
    law_dir = DATA_DIR / "法律原文"
    if law_dir.exists():
        print(f"\n[1/3] 处理法律原文: {law_dir}")
        law_files = [f for f in os.listdir(law_dir) if f.endswith('.doc')]
        print(f"  共 {len(law_files)} 个文件")
        law_count = 0
        for f in law_files:
            fp = os.path.join(law_dir, f)
            records = RecordBuilder.build_law_record(fp)
            all_records.extend(records)
            law_count += len(records)
            if records:
                print(f"  [OK] {f} -> {len(records)} 条")
            else:
                print(f"  [FAIL] {f} -> 0 条")
        print(f"  法律原文共提取 {law_count} 条记录")

    # --- 处理司法解释 ---
    interp_dir = DATA_DIR / "司法解释"
    if interp_dir.exists():
        print(f"\n[2/3] 处理司法解释: {interp_dir}")
        interp_files = [f for f in os.listdir(interp_dir) if f.endswith('.doc')]
        print(f"  共 {len(interp_files)} 个文件")
        interp_count = 0
        for f in interp_files:
            fp = os.path.join(interp_dir, f)
            records = RecordBuilder.build_interpretation_record(fp)
            all_records.extend(records)
            interp_count += len(records)
            if records:
                print(f"  [OK] {f} -> {len(records)} 条")
            else:
                print(f"  [FAIL] {f} -> 0 条")
        print(f"  司法解释共提取 {interp_count} 条记录")

    # --- 处理案例 ---
    case_dir = DATA_DIR / "案例"
    if case_dir.exists():
        print(f"\n[3/3] 处理案例: {case_dir}")
        case_count = 0
        for sub_dir in sorted(os.listdir(case_dir)):
            sub_path = os.path.join(case_dir, sub_dir)
            if not os.path.isdir(sub_path):
                continue
            case_files = [f for f in os.listdir(sub_path) if f.endswith('.doc')]
            print(f"  [{sub_dir}] 共 {len(case_files)} 个文件")
            sub_count = 0
            for f in case_files:
                fp = os.path.join(sub_path, f)
                record = RecordBuilder.build_case_record(fp, sub_dir)
                if record:
                    all_records.append(record)
                    sub_count += 1
            print(f"  [{sub_dir}] extracted {sub_count} records")
            case_count += sub_count
        print(f"  案例共提取 {case_count} 条记录")

    # --- 保存JSON ---
    output_path = DATA_DIR / "all_records.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"\n全部记录已保存至: {output_path}")
    print(f"总计: {len(all_records)} 条记录")

    # 统计
    type_counts = defaultdict(int)
    for r in all_records:
        type_counts[r['doc_type']] += 1
    print(f"  法律条文: {type_counts['law']}")
    print(f"  司法解释: {type_counts['interpretation']}")
    print(f"  案例: {type_counts['case']}")

    return all_records


def build_reverse_references(records: list) -> dict:
    """构建反向引用索引：法条被哪些案例引用"""
    print("\n构建反向引用索引...")

    # 法律条文索引：(法律名, 条号) → [记录ID]
    law_index = defaultdict(list)
    interp_index = defaultdict(list)

    for r in records:
        if r['doc_type'] == 'law':
            key = f"{r.get('law_name', '')}|{r.get('article_number', '')}"
            law_index[key].append(r['id'])
        elif r['doc_type'] == 'interpretation':
            key = f"{r.get('interpretation_name', '')}|{r.get('article_number', '')}"
            interp_index[key].append(r['id'])

    # 案例引用法条的反向索引
    law_to_cases = defaultdict(list)
    interp_to_cases = defaultdict(list)

    for r in records:
        if r['doc_type'] != 'case':
            continue
        for ref in r.get('relations', {}).get('laws', []):
            key = f"{ref['name']}|{ref['article']}"
            law_to_cases[key].append(r['case_number'])
        for ref in r.get('relations', {}).get('interpretations', []):
            key = f"{ref['name']}|{ref['article']}"
            interp_to_cases[key].append(r['case_number'])

    print(f"  法律→案例引用: {len(law_to_cases)} 条")
    print(f"  解释→案例引用: {len(interp_to_cases)} 条")

    return {
        'law_to_cases': dict(law_to_cases),
        'interp_to_cases': dict(interp_to_cases)
    }


def save_vector_data(records: list):
    """保存向量数据库所需的documents和metadata"""
    print("\n准备向量数据库数据...")

    documents = []
    metadata = []

    for r in records:
        documents.append(r['content'])

        meta = {
            'id': r['id'],
            'source': r.get('source', ''),
            'article_number': r.get('article_number', ''),
            'doc_type': r['doc_type'],
        }

        # 添加层级信息
        if 'hierarchy' in r:
            meta['book'] = r['hierarchy'].get('book', '')
            meta['subbook'] = r['hierarchy'].get('subbook', '')
            meta['chapter'] = r['hierarchy'].get('chapter', '')
            meta['section'] = r['hierarchy'].get('section', '')

        # 案例特有字段
        if r['doc_type'] == 'case':
            meta['case_number'] = r.get('case_number', '')
            meta['court'] = r.get('court', '')
            meta['date'] = r.get('date', '')
            meta['case_type'] = r.get('case_type', '')

        metadata.append(meta)

    output = {
        'documents': documents,
        'metadata': metadata
    }

    output_path = DATA_DIR / "vector_data.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)
    print(f"  向量数据已保存至: {output_path}")
    print(f"  共 {len(documents)} 条记录")

    return output


def generate_registry(records: list):
    """生成registry.json，供RAG系统查询可用法律和案例清单"""
    print("\n生成registry.json...")

    registry = []
    seen = set()

    for r in records:
        doc_type = r['doc_type']
        r_id = r['id']

        # 每个文档（不是每条记录）只注册一次
        if doc_type == 'law':
            # 提取文档前缀（去掉条号）
            prefix = r_id.rsplit('_', 1)[0] if '_第' in r_id else r_id
            if prefix in seen:
                continue
            seen.add(prefix)
            registry.append({
                "docx_name": r.get('full_name', r.get('law_name', '')),
                "type": "law",
                "source": r.get('source', ''),
                "law_name": r.get('law_name', ''),
                "issuing_authority": r.get('issuing_authority', ''),
                "timeliness": r.get('timeliness', ''),
            })
        elif doc_type == 'interpretation':
            prefix = r_id.rsplit('_', 1)[0] if '_第' in r_id else r_id
            if prefix in seen:
                continue
            seen.add(prefix)
            registry.append({
                "docx_name": r.get('full_name', r.get('interpretation_name', '')),
                "type": "interpretation",
                "source": r.get('source', ''),
                "interpretation_name": r.get('interpretation_name', ''),
                "issuing_authority": r.get('issuing_authority', ''),
                "timeliness": r.get('timeliness', ''),
            })
        elif doc_type == 'case':
            if r_id in seen:
                continue
            seen.add(r_id)
            registry.append({
                "docx_name": r.get('case_number', ''),
                "type": "case",
                "source": r.get('source', ''),
                "court": r.get('court', ''),
                "date": r.get('date', ''),
                "case_causes": r.get('case_causes', []),
            })

    output_path = DATA_DIR / "registry.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    print(f"  registry.json已保存至: {output_path}")
    print(f"  共 {len(registry)} 条记录")

    return registry


if __name__ == "__main__":
    start = time.time()

    # 处理所有数据
    records = process_all_data()

    # 构建反向引用
    reverse_refs = build_reverse_references(records)
    ref_path = DATA_DIR / "reverse_references.json"
    with open(ref_path, 'w', encoding='utf-8') as f:
        json.dump(reverse_refs, f, ensure_ascii=False)
    print(f"反向引用已保存至: {ref_path}")

    # 准备向量数据
    save_vector_data(records)

    # 生成registry.json
    generate_registry(records)

    elapsed = time.time() - start
    print(f"\n全部完成！耗时 {elapsed:.1f} 秒")
